const maxMineCount = 10
const maxMintCount = 10

import {
    error,
    IRequestStrict,
    json,
    Router,
    RouterType,
    StatusError,
    text,
} from 'itty-router'
import { server } from '../queue/common'
import { SorobanRpc } from 'soroban-client'
import { chunkArray, sortMapKeys } from '../utils'

export class MintFactory {
    id: DurableObjectId
    storage: DurableObjectStorage
    env: Env
    state: DurableObjectState
    router: RouterType = Router()
    pending: { hash: string, retry: number, body: MintJob }[] = []
    channel_account_hash: DurableObjectId

    constructor(state: DurableObjectState, env: Env) {
        this.id = state.id
        this.storage = state.storage
        this.env = env
        this.state = state
        this.channel_account_hash = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')

        this.router
            .get('/', this.getJob.bind(this))
            .post('/', this.mintJob.bind(this))
            .patch('/:hash', this.patchJob.bind(this))
            .all('*', () => error(404))

        state.blockConcurrencyWhile(async () => {
            await this.storage.deleteAlarm()
            await this.storage.setAlarm(Date.now() + 5000)
            this.pending = await this.storage.get('pending') || []
        })

        // TODO we should probably save every job to the KV for review and cleanup in a cron job later
    }
    fetch(req: Request, ...extra: any[]) {
        return this.router
            .handle(req, ...extra)
            .then(json)
            .catch((err) => {
                console.error(err)
                return error(err)
            })
    }
    async alarm() {
        // NOTE throwing in an alarm triggers a re-run up to six times, we should never throw an alarm then methinks
        try {
            for (const { hash, retry, body } of this.pending) { // TODO this could be a lot of pending hashes, we should cap this at some reasonable number
                const index = this.pending.findIndex(({ hash: h }) => h === hash)

                if (index === -1)
                    throw new StatusError(400, 'Hash not found')

                const res = await server.getTransaction(hash)

                switch (res.status) {
                    case 'SUCCESS':
                        console.log(res.status)

                        // remove the hash from pending
                        this.pending.splice(index, 1)

                        // update job progress
                        await this.markProgress(body, res)

                        // return the channel
                        await this.returnChannel(body.channel)

                        break;
                    case 'NOT_FOUND':
                        console.log(retry, res)

                        if (retry < 12) {
                            this.pending[index].retry++
                        } else {
                            // remove the hash from pending
                            this.pending.splice(index, 1)

                            // re-queue the tx
                            // NOTE there is a wild chance that even after {x} retries the tx might eventually succeed causing a double mine
                            // We should probably check for the colors we're about to mine before mining them in the `process_mine`
                            // we can avoid this issue by including some better time limits on transaction submissions to be less than whenever this would fire
                            await this.env.MINT_QUEUE.send(body)

                            // return the channel
                            await this.returnChannel(body.channel)
                        }

                        break;
                    case 'FAILED':
                        console.log(hash, res)

                        // remove the hash from pending
                        this.pending.splice(index, 1)

                        // TODO save the error

                        // TODO there can be failures do to the resourcing in which case we should toss this hash but re-queue the tx
                        // we should be somewhat careful here though as this type of failure likely means funds were spent
                        // ideally we'd be smarter about submission and not submit txs in parallel that require serial processing
                        // await this.env.MINT_QUEUE.send(body) // TEMP

                        // return the channel
                        await this.returnChannel(body.channel)

                        break;
                }
            }

            await this.storage.put('pending', this.pending)
        }

        catch (err) {
            console.error(err)
        }

        finally {
            await this.storage.setAlarm(Date.now() + 5000)
        }
    }

    async getJob() {
        const status = await this.storage.get('status')
        const mineTotal = await this.storage.get('mine_total')
        const mineProgress = await this.storage.get('mine_progress')
        const mintTotal = await this.storage.get('mint_total')
        const mintProgress = await this.storage.get('mint_progress')
        const hash = await this.storage.get('hash')

        return json({
            id: this.id.toString(),
            status,
            mineTotal,
            mineProgress,
            mintTotal,
            mintProgress,
            hash
        })
    }
    async mintJob(req: Request) {
        // TODO this method of minting requires both the mining and minting be done by the same secret
        // you cannot use colors mined by other miners
        // you can't even really use your own mined colors as this will freshly mint all colors before doing the mint
        // fine for now just be aware

        // TODO check if the to-be-minted glyph already exists before going through all the trouble
        // if requested colors already exist in the minter's inventory use those
        // !! slightly dangerous if there are multiple mints queued as you could promised a color already committed
        // might only allow one mint at a time

        // NOTE I don't love that we have to send along the secret here but given we have to authorize stuff far into the future this is probably the only way
        // We may be able to send along a ton of signed SorobanAuthEntries but that leaves us slightly fragile to changes in case of tx submission failure
        // But maybe since we have separation from stellar stuff and soroban stuff we can just mod the stellar tx and keep popping the same SorobanAuthEntries in
        // If we do end up passing along secrets though we don't really need to use channel accounts, we can just continue to use the same pubkey
        // Or actually maybe channel accounts are still good as it allows us to spread the mint for a single account across many channel accounts making the mint faster 🧠

        const body = await req.json() as MintRequest || {}

        const mineChunks = new Array(Math.ceil(body.palette.length / maxMineCount)).fill(0)

        await this.storage.put('status', 'mining')
        await this.storage.put('mine_total', mineChunks.length)
        await this.storage.put('mine_progress', 0)
        await this.storage.put('body', {
            palette: body.palette,
            width: body.width,
            secret: body.secret,
        })

        // queue up the mine jobs
        const mineJobs: { body: MintJob }[] = mineChunks.map((_, index) => {
            const slice = body.palette.slice(index * maxMineCount, index * maxMineCount + maxMineCount)

            return {
                body: {
                    id: this.id.toString(),
                    type: 'mine',
                    secret: body.secret,
                    palette: slice,
                }
            }
        })

        for (const mineJobsChunk of chunkArray(mineJobs, 100)) {
            await this.env.MINT_QUEUE.sendBatch(mineJobsChunk)
        }

        // TODO
        // Precalc the hash and store in KV
        // Pregen the image and store in Images

        return text(this.id.toString())
    }
    async patchJob(req: IRequestStrict) {
        this.pending.push({
            hash: req.params.hash,
            retry: 0,
            body: await req.json() as MintJob
        })

        await this.storage.put('pending', this.pending)
    }

    async markProgress(body: MintJob, res: SorobanRpc.GetSuccessfulTransactionResponse) {
        switch (body.type) {
            case 'mine':
                await this.mineProgress()
                break;
            case 'mint':
                if (body.width)
                    await this.mintComplete(res)
                else
                    await this.mintProgress()
                break;
            default:
                throw new StatusError(404, 'Type not found')
        }
    }
    async mineProgress() {
        const mineTotal: number = await this.storage.get('mine_total') || 0

        let mineProgress: number = await this.storage.get('mine_progress') || 0

        mineProgress++

        // mining is done, move on to minting
        if (mineProgress >= mineTotal) {
            const body: any = await this.storage.get('body')

            if (!body)
                throw new StatusError(404, 'Job not found')

            let mintIndexes: Map<number, number[]> = new Map(body.palette.map((color: number, index: number) => [color, [index]]))
            mintIndexes = sortMapKeys(mintIndexes)

            // TODO making these empty counter/loop arrays feels a little silly, but maybe not?
            const mintChunks = new Array(Math.ceil(mintIndexes.size / maxMintCount)).fill(0)

            await this.storage.put('status', 'minting')
            await this.storage.put('mine_progress', mineTotal)

            // These minting requests actually need to execute serially vs in parallel (as the color mining can)
            // this is due to the glyph growing in size so preemtive parallel tx submission will have bad simulated resource assumptions
            // this probably means we store progress here in the DO and just slowly work through a task list inside the alarm and every time we get a new mint success we move on to the next mint palette
            // once that mint palette queue is empty we can move on to the final mint

            // Queue up the mint jobs
            const mintJobs: MintJob[] = mintChunks.map((_, index) => {
                const slice = Array.from(mintIndexes).slice(index * maxMintCount, index * maxMintCount + maxMintCount)

                return {
                    id: this.id.toString(),
                    type: 'mint',
                    palette: slice,
                    secret: body.secret,
                }
            })

            // Kick off the first mint job
            let [mintJob] = mintJobs.splice(0, 1)

            await this.env.MINT_QUEUE.send(mintJob)
            await this.storage.put('mint_jobs', mintJobs)
            await this.storage.put('mint_total', mintChunks.length)
            await this.storage.put('mint_progress', 0)
        } else {
            await this.storage.put('mine_progress', mineProgress)
        }
    }
    async mintProgress() {
        let mintProgress: number = await this.storage.get('mint_progress') || 0

        mintProgress++

        // Look up the next `mint_job` and queue it then update the `mint_job` with that job removed
        let mintJobs: MintJob[] = await this.storage.get('mint_jobs') || []
        let [mintJob] = mintJobs.splice(0, 1)

        if (mintJob) {
            await this.env.MINT_QUEUE.send(mintJob)
            await this.storage.put('mint_jobs', mintJobs)
            await this.storage.put('mint_progress', mintProgress)
        }

        // Once we're all done minting issue one final mint with the width
        else {
            const mintTotal: number = await this.storage.get('mint_total') || 0
            const body: any = await this.storage.get('body')
            const mintJob: MintJob = {
                id: this.id.toString(),
                type: 'mint',
                palette: [],
                secret: body.secret,
                width: body.width,
            }

            await this.env.MINT_QUEUE.send(mintJob)
            await this.storage.put('mint_progress', mintTotal)
        }
    }
    async mintComplete(res: SorobanRpc.GetSuccessfulTransactionResponse) {
        const hash = res.returnValue?.bytes().toString('hex')

        await this.storage.put('hash', hash)
        await this.storage.put('status', 'complete')

        // TODO eventually use flushAll but only once this success has been saved to the KV or some permanent store
        // Otherwise our getJob will fail as we will have flushed out all the storage lol

        await this.storage.sync()
        await this.storage.deleteAlarm()

        this.state.blockConcurrencyWhile(async () => {
            await this.storage.sync()
            await this.storage.deleteAlarm()
        })
    }

    async returnChannel(secret?: string) {
        return secret 
        ? this.env.CHANNEL_ACCOUNT
            .get(this.channel_account_hash)
            .fetch(`http://fake-host/return/${secret}`)
        : undefined
    }
    async flushAll() {
        await this.storage.sync()
        await this.storage.deleteAlarm()
        await this.storage.deleteAll()

        this.state.blockConcurrencyWhile(async () => {
            await this.storage.sync()
            await this.storage.deleteAlarm()
            await this.storage.deleteAll()
        })
    }
}