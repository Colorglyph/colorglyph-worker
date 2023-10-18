const maxMineSize = 10

// TODO at least these values need more tuning, especially the maxMintCount as there are likely size/count combos that could cause failure
const maxMintSize = 10
const maxMintCount = 50

import {
    error,
    IRequestStrict,
    json,
    Router,
    RouterType,
    status,
    StatusError,
    text,
} from 'itty-router'
import { server } from '../queue/common'
import { SorobanRpc } from 'soroban-client'
import { chunkArray, getGlyphHash } from '../utils'
import { paletteToBase64 } from '../utils/paletteToBase64'
import { fetcher } from 'itty-fetcher'

const rpc = fetcher({ base: 'https://rpc-futurenet.stellar.org' })

// TODO Need a cron task to reboot alarms for mint jobs that were currently in process if/when the DO was rebooted
// I think a simple ping/healthcheck to the DO id would be sufficient

// TODO need a robust plan for DO to be restarted at any point

export class MintFactory {
    id: DurableObjectId
    storage: DurableObjectStorage
    env: Env
    state: DurableObjectState
    router: RouterType
    pending: { hash: string, retry: number, body: MintJob }[]
    channel_account_hash: DurableObjectId
    complete: boolean
    ttl: number

    constructor(state: DurableObjectState, env: Env) {
        this.id = state.id
        this.storage = state.storage
        this.env = env
        this.state = state
        this.router = Router()
        this.pending = []
        this.channel_account_hash = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
        this.complete = false
        this.ttl = Date.now() + 3_600_000 // DO will survive for 1hr before dying the good death. Any mints taking longer than that won't complete

        this.router
            .get('/', this.getJob.bind(this))
            .post('/', this.mintJob.bind(this))
            .patch('/:hash', this.patchJob.bind(this))
            .delete('/', this.flushAll.bind(this))
            .all('*', () => error(404))

        state.blockConcurrencyWhile(async () => {
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
        if (
            this.complete
            || Date.now() > this.ttl
        ) return

        console.log(this.id.toString())

        // TODO very concerned about eternal alarms
        // we should probably set some reasonable lifespan at which point we gracefully destroy the DO and kill the alarm
        // for now let's hard code a 1hr max lifespan

        // NOTE throwing in an alarm triggers a re-run up to six times, we should never throw an alarm then methinks
        try {
            // NOTE we use a for loop vs a Promise.all/allSettled in order to ensure sequential processing
            // Not sure why but many and very bad things always happened when processing in parallel
            
            // TODO this could be a lot of pending hashes, we should cap this at some reasonable number
            for (const { hash, retry, body } of this.pending) {
                const index = this.pending.findIndex(({ hash: h }) => h === hash)

                if (index === -1)
                    throw new StatusError(400, 'Hash not found') // TODO idk if `StatusError` makes sense in the `alarm` here

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
                        // remove the hash from pending
                        this.pending.splice(index, 1)

                        // TEMP while we wait for `soroban-client` -> `server.getTransaction` -> `FAILED` to send more complete data
                        try {
                            const res: string = await rpc.post('/', {
                                jsonrpc: '2.0',
                                id: 8675309,
                                method: 'getTransaction',
                                params: {
                                    hash
                                }
                            }).then((res) => JSON.stringify(res, null, 2))

                            console.log(hash, res)
                            
                            // save the error
                            const id = this.id.toString()
                            const existing = await this.env.ERRORS.get(id)

                            const encoder = new TextEncoder()
                            const data = encoder.encode(`${await existing?.text()}\n\n${hash}\n\n${res}`)
                            
                            await this.env.ERRORS.put(id, data)
                        } catch {
                            console.log(hash, res)
                        }

                        // TODO there can be failures do to the resourcing in which case we should toss this hash but re-queue the tx
                        // we should be somewhat careful here though as this type of failure likely means funds were spent
                        // await this.env.MINT_QUEUE.send(body) // TEMP. Bad idea!!

                        // return the channel
                        await this.returnChannel(body.channel)

                        break;
                }

                await this.storage.put('pending', this.pending)
            }
        }

        catch (err) {
            console.error(JSON.stringify(err, null, 2))
        }

        finally {
            await this.storage.setAlarm(Date.now() + 5000)
        }
    }

    async getJob(req: Request) {
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
        const sanitizedPaletteArray: [number, number][][] = []

        // Precalc the hash
        const hash = await getGlyphHash(body.palette, body.width)

        let map = new Map()

        for (const i in body.palette) {
            const index = Number(i)
            const color = body.palette[index]
            const amount: number = map.get(color) || 0
            map.set(color, amount + 1)

            if (
                index === body.palette.length - 1
                || map.size >= 10
            ) {
                sanitizedPaletteArray.push([...map.entries()])
                map = new Map()
            }
        }

        await this.storage.put('hash', hash)
        await this.storage.put('status', 'mining')
        await this.storage.put('mine_total', sanitizedPaletteArray.length)
        await this.storage.put('mine_progress', 0)
        await this.storage.put('body', {
            palette: body.palette,
            width: body.width,
            secret: body.secret,
        })

        // Pre-gen the image and store in R2
        const image = await paletteToBase64(body.palette, body.width)

        // NOTE this should maybe happen in a queue task? idk it's a very small amount of data
        // At the very least do it before queuing anything up in case the queue fails for some reason
        await this.env.IMAGES.put(hash, image)

        // store in KV
        // store the palette in the body
        // store other info in the metadata
        await this.env.GLYPHS.put(hash, new Uint8Array(body.palette), {
            metadata: {
                id: this.id.toString(),
                width: body.width,
            }
        })

        // TOOD should also put some stuff in a D1 for easy sorting and searching?

        // queue up the mine jobs
        const mineJobs: { body: MintJob }[] = sanitizedPaletteArray.map((slice) => ({
            body: {
                id: this.id.toString(),
                type: 'mine',
                secret: body.secret,
                palette: slice,
            }
        }))

        const errors = await Promise
            .allSettled(chunkArray(mineJobs, 100).map((mineJobsChunk) => this.env.MINT_QUEUE.sendBatch(mineJobsChunk)))
            .then((res) => res.filter((res) => res.status === 'rejected'))

        if (errors.length) {
            console.error(JSON.stringify(errors, null, 2))
            throw new StatusError(500, 'Failed to queue mine jobs')
        }

        return text(this.id.toString())
    }
    async patchJob(req: IRequestStrict) {
        this.pending.push({
            hash: req.params.hash,
            retry: 0,
            body: await req.json() as MintJob
        })

        await this.storage.put('pending', this.pending)

        if (!await this.storage.getAlarm())
            await this.storage.setAlarm(Date.now() + 5000)

        return status(204)
    }
    async flushAll(req?: Request) {
        // TODO be a little smarter before flushing everything
        // if there are pending tasks fail them gracefully. e.g. don't lose channel accounts
        // hmm interestingly too it's possible tasks may be queued which will bring this DO back to life which would be very bad
        // we likely need a failsafe way for all requests to know if the DO is dead or not

        this.complete = true

        await this.storage.sync()
        await this.storage.deleteAlarm()
        await this.storage.deleteAll()

        this.state.blockConcurrencyWhile(async () => {
            await this.storage.sync()
            await this.storage.deleteAlarm()
            await this.storage.deleteAll()
        })

        if (req)
            return status(204)
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

            const sanitizedPaletteArray: [number, number[]][][] = []

            let count = 0
            let map = new Map()

            for (const i in body.palette) {
                const index = Number(i)
                const color = body.palette[index]
                const indexes: number[] = map.get(color) || []
                indexes.push(index)
                map.set(color, indexes)
                count++

                if (
                    index === body.palette.length - 1
                    || map.size >= maxMintSize
                    || count >= maxMintCount
                ) {
                    sanitizedPaletteArray.push([...map.entries()])
                    count = 0
                    map = new Map()
                }
            }

            await this.storage.put('status', 'minting')
            await this.storage.put('mine_progress', mineTotal)

            // These minting requests actually need to execute serially vs in parallel (as the color mining can)
            // this is due to the glyph growing in size so preemtive parallel tx submission will have bad simulated resource assumptions
            // this probably means we store progress here in the DO and just slowly work through a task list inside the alarm and every time we get a new mint success we move on to the next mint palette
            // once that mint palette queue is empty we can move on to the final mint

            // Queue up the mint jobs
            const mintJobs: MintJob[] = sanitizedPaletteArray.map((slice) => ({
                id: this.id.toString(),
                type: 'mint',
                palette: slice,
                secret: body.secret,
            }))

            // Kick off the first mint job
            let [mintJob] = mintJobs.splice(0, 1)

            await this.env.MINT_QUEUE.send(mintJob)
            await this.storage.put('mint_jobs', mintJobs)
            await this.storage.put('mint_total', sanitizedPaletteArray.length)
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
        const pre_hash = await this.storage.get('hash')
        const hash = res.returnValue?.bytes().toString('hex')

        if (pre_hash !== hash)
            console.log('!! BIG BAD HASH MISMATCH !!')

        if (hash) {
            // await this.storage.put('hash', hash) // NOTE hopefully the hash was the same as what we pre-calced 😳

            const body: any = await this.storage.get('body')

            await this.env.GLYPHS.put(hash, new Uint8Array(body.palette), {
                metadata: {
                    id: this.id.toString(),
                    width: body.width,
                    status: 'minted' // system oriented. i.e. `minted|scraped`
                }
            })
        }
        
        // await this.storage.put('status', 'complete')

        // NOTE no need to store anything on the DO if we're just going to flush as the last command
        await this.flushAll()
    }

    async returnChannel(secret?: string) {
        return secret
            ? this.env.CHANNEL_ACCOUNT
                .get(this.channel_account_hash)
                .fetch(`http://fake-host/return/${secret}`)
            : undefined
    }
}