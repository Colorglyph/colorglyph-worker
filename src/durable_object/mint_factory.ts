const maxMineSize = 17 // 500 // 17
const maxMintSize = 18 // 200 // 18

import {
    error,
    json,
    Router,
    RouterType,
    status,
    StatusError,
    text,
} from 'itty-router'
import { xdr } from 'stellar-sdk'
import { chunkArray, getGlyphHash } from '../utils'
import { paletteToBase64 } from '../utils/paletteToBase64'

// NOTE A durable object can die at any moment due to a code push
// this causes all pending state to be lost and all pending requests to die
// for alarms this means the alarm will exit somewhere in the middle and then magically retry itself with no ability to catch that exception

// TODO seeing a MASSIVE number or requests and sub requests
// need to trace out what's going on here
// maybe a rogue loop somewhere?
// do KV, R2 and Queue requests count towards requests and/or sub requests?

export class MintFactory {
    id: DurableObjectId
    env: Env
    state: DurableObjectState
    storage: DurableObjectStorage
    router: RouterType

    constructor(state: DurableObjectState, env: Env) {
        this.id = state.id
        this.env = env
        this.state = state
        this.storage = state.storage
        this.router = Router()

        this.router
            .get('/', this.getJob.bind(this))
            .post('/', this.mintJob.bind(this))
            .patch('/', this.markProgress.bind(this))
            .delete('/', this.flushAll.bind(this))
            .all('*', () => error(404))
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

    async getJob(req: Request) {
        const body: any = await this.storage.get('body')
        const status = await this.storage.get('status')
        const mineTotal = await this.storage.get('mine_total')
        const mineProgress = await this.storage.get('mine_progress')
        const mintTotal = await this.storage.get('mint_total')
        const mintProgress = await this.storage.get('mint_progress')

        return json({
            id: this.id.toString(),
            hash: body?.hash,
            status,
            mineTotal,
            mineProgress,
            mintTotal,
            mintProgress,
        })
    }
    async mintJob(req: Request) {
        // TODO this method of minting requires both the mining and minting be done by the same secret
        // you cannot use colors mined by other miners
        // you can't even really use your own mined colors as this will freshly mine all colors before doing the mint
        // fine for now just be aware

        // TODO if requested colors already exist in the minter's inventory use those
        // slightly instable if there are multiple mints queued as you could promise a color already committed
        // might should only allow one mint at a time per destination address

        // TODO I don't love that we have to send along the secret here but given we have to authorize stuff far into the future this is probably the only way
        // We may be able to send along a ton of signed SorobanAuthEntries but that leaves us slightly fragile to changes in case of tx submission failure
        // But maybe since we have separation from stellar stuff and soroban stuff we can just mod the stellar tx and keep popping the same SorobanAuthEntries in
        // If we do end up passing along secrets though we don't really need to use channel accounts, we can just continue to use the same pubkey
        // Or actually maybe channel accounts are still good as it allows us to spread the mines for a single account across many channel accounts making mining faster 🧠
        // It's possible we could combine soroban auth, channel accounts and fee bumps in order to have Colorglyph pay fees, users pay sequence numbers and the final mint to arrive in the user's wallet

        // TODO switch to using a two account mint
        // one account for the progressive mint account and the other for the final destination address
        // the one is a secret key and the other is a public key
        // this may require the ability to set the miner address separate from the signing account paying the mining fee
        // there's an address that pays the mining fee, there's an address that is the miner who will receive royalties, and there's the address that receives the final minted glyph
        // ---
        // this is the destination for the glyph and the miner for the colors
        // this is the address that pays the mining fee
        // this is the address that receives the colors and must sign for the minting
        // this is the address that will serve for the progressive minting
        
        const body = await req.json() as MintRequest || {}
        const sanitizedPaletteArray: [number, number][][] = []

        // Precalc the hash
        const hash = await getGlyphHash(body.palette, body.width)

        // TODO lookup if this hash already exists
        // if it does see if it's scraped
        // if it is re-mint it
        // if it's not, fail this request
        const glyph = await this.env.GLYPHS.get(hash, 'arrayBuffer')

        let map = new Map()

        for (const i in body.palette) {
            const index = Number(i)
            const color = body.palette[index]
            const amount: number = map.get(color) || 0
            map.set(color, amount + 1)

            if (
                index === body.palette.length - 1
                || map.size >= maxMineSize
            ) {
                sanitizedPaletteArray.push([...map.entries()])
                map = new Map()
            }
        }

        if (!glyph) { // TEMP until we handle the scrape scenario better as the status of a glyph should change between minted and scraped (also probably means that status should be stored outside the GLYPH KV itself)
            // Pre-gen the image and store in R2
            const image = await paletteToBase64(body.palette, body.width)
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
        }

        await this.storage.put('status', 'mining')
        await this.storage.put('mine_total', sanitizedPaletteArray.length)
        await this.storage.put('mine_progress', 0)
        await this.storage.put('body', {
            hash,
            palette: body.palette,
            width: body.width,
            secret: body.secret,
        })

        // TODO should also put some stuff in a D1 for easy sorting and searching?

        // TODO we should probably save every job to the KV for review and cleanup in a cron job later

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
            .allSettled(chunkArray(mineJobs, 100).map((mineJobsChunk) =>
                this.env.TX_SEND.sendBatch(mineJobsChunk))
            )
            .then((res) => res.filter((res) => res.status === 'rejected'))

        if (errors.length) {
            // TODO this is big bad btw, would result in an incompletable mint
            // Thankfully because we save how much work we _should_ be doing we'll never attempt a full mint of an incomplete partial mint
            console.log(`!! we didn't queue all the mine jobs !!`)
            console.log(errors)
        }

        return text(this.id.toString())
    }
    async markProgress(req: Request) {
        const body: any = await this.storage.get('body')

        // this should exit early if the DO has been flushed at any point (storage body is gone)
        if (!body)
            throw new StatusError(404, 'Body not found')

        const { mintJob, feeCharged, returnValueXDR }: {
            mintJob: MintJob,
            feeCharged: string,
            returnValueXDR: string | undefined
        } = await req.json() as any

        switch (mintJob.type) {
            case 'mine':
                await this.mineProgress(body)
                break;
            case 'mint':
                if (mintJob.width)
                    await this.mintComplete(body, feeCharged, returnValueXDR)
                else
                    await this.mintProgress(body)
                break;
            default:
                throw new StatusError(404, `Type ${mintJob.type} not found`)
        }

        return status(204)
    }
    async flushAll(req?: Request) {
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

    async mineProgress(body: any) {
        const mineTotal: number = await this.storage.get('mine_total') || 0

        if (!mineTotal)
            throw new StatusError(400, 'Nothing to mine')

        let mineProgress: number = await this.storage.get('mine_progress') || 0

        mineProgress++

        await this.storage.put('mine_progress', mineProgress)

        // mining is done, move on to minting
        if (mineProgress === mineTotal) {
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
                ) {
                    sanitizedPaletteArray.push([...map.entries()])
                    count = 0
                    map = new Map()
                }
            }

            await this.storage.put('status', 'minting')
            await this.storage.put('mint_total', sanitizedPaletteArray.length)
            await this.storage.put('mint_progress', 0)

            // NOTE These minting requests actually need to execute serially vs in parallel (as the color mining can)
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
            const mintJob = mintJobs.shift()!

            await this.storage.put('mint_jobs', mintJobs)
            await this.env.TX_SEND.send(mintJob)
        }
    }
    async mintProgress(body: any) {
        // Look up the next `mint_job` and queue it then update the `mint_job` with that job removed
        const mintJobs: MintJob[] = await this.storage.get('mint_jobs') || []
        const mintTotal: number = await this.storage.get('mint_total') || mintJobs.length
        const mintJob = mintJobs.shift()

        await this.storage.put('mint_progress', mintTotal - mintJobs.length)

        if (mintJob) {
            await this.env.TX_SEND.send(mintJob)
            await this.storage.put('mint_jobs', mintJobs)
        }

        // Once we're all done minting issue one final mint with the width
        else {
            const mintJob: MintJob = {
                id: this.id.toString(),
                type: 'mint',
                palette: [],
                secret: body.secret,
                width: body.width,
            }

            await this.env.TX_SEND.send(mintJob)
            await this.storage.delete('mint_jobs')
        }
    }
    async mintComplete(body: any, feeCharged: string, returnValueXDR: string | undefined) {
        const returnValue = xdr.ScVal.fromXDR(returnValueXDR!, 'base64')
        const hash = returnValue.bytes().toString('hex')

        if (hash)
            await this.env.GLYPHS.put(hash, new Uint8Array(body.palette), {
                metadata: {
                    id: this.id.toString(),
                    fee: feeCharged,
                    width: body.width,
                    length: body.palette.length,
                    status: 'minted', // system oriented. i.e. `minted|scraped`
                    mishash: body.hash !== hash ? body.hash : undefined, // realistically this should never happen, but if it does we need to save both hashes
                }
            })

        await this.flushAll()
    }
}