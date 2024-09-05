const maxMineSize = 23
const maxMintSize = 24 // NOTE the first iteration must be 23 if the glyph hash is brand new

import {
    error,
    json,
    Router,
    RouterType,
    status,
    StatusError,
    text,
} from 'itty-router'
import BigNumber from 'bignumber.js'
import { getGlyphHash } from '../utils'
import { paletteToBase64 } from '../utils/paletteToBase64'

// NOTE A durable object can die at any moment due to a code push
// this causes all pending state to be lost and all pending requests to die
// for alarms this means the alarm will exit somewhere in the middle and then magically retry itself with no ability to catch that exception

// TODO seeing a MASSIVE number or requests and sub requests
// need to trace out what's going on here
// maybe a rogue loop somewhere?
// do KV, R2 and Queue requests count towards requests and/or sub requests?

// TODO switch from a router based to the new function based DO

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
            .catch((err: any) => {
                console.error(err)
                return error(err)
            })
    }

    async getJob(req: Request) {
        const body: any = await this.storage.get('body')
        const cost = await this.storage.get('cost')
        const status = await this.storage.get('status')
        const mineTotal = await this.storage.get('mine_total')
        const mineProgress = await this.storage.get('mine_progress')
        const mintTotal = await this.storage.get('mint_total')
        const mintProgress = await this.storage.get('mint_progress')

        return json({
            id: this.id.toString(),
            hash: body?.hash,
            cost,
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
        const glyph = await this.env.DB.prepare('SELECT Length FROM Glyphs WHERE Hash = ?').bind(hash).first();

        if (glyph) {
            if (glyph.Length) {
                await this.flushAll()
                throw new StatusError(400, `Glyph ${hash} already exists`)
            }
        } else {
            const image = await paletteToBase64(body.palette, body.width)

            // TODO should we pack the D1 with everything we have? width, owner, minter, etc?
            
            await this.env.IMAGES.put(`png:${hash}`, image)
            await this.env.DB.prepare(`
                INSERT INTO Glyphs ("Hash", Id)
                VALUES (?1, ?2)
                ON CONFLICT("Hash") DO NOTHING
            `)
                .bind(hash, this.id.toString())
                .run()
        }

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

        // queue up the mine jobs
        const mineJobs: MintJob[] = sanitizedPaletteArray.map((slice) => ({
            id: this.id.toString(),
            type: 'mine',
            secret: body.secret,
            palette: slice,
        }))

        await this.storage.put('status', 'mining')
        await this.storage.put('mine_total', mineJobs.length)
        await this.storage.put('mine_progress', 0)
        await this.storage.put('body', {
            hash,
            palette: body.palette,
            width: body.width,
            secret: body.secret,
        })

        // TODO we should probably save every job to the KV for review and cleanup in a cron job later

        // Kick off the first mine job
        const mineJob = mineJobs.shift()!

        await this.storage.put('mine_jobs', mineJobs)
        await this.env.TX_SEND.send(mineJob)

        return text(this.id.toString())
    }
    async markProgress(req: Request) {
        const body: any = await this.storage.get('body')

        // this should exit early if the DO has been flushed at any point (storage body is gone)
        if (!body)
            throw new StatusError(404, 'Body not found')

        const { mintJob, feeCharged }: {
            mintJob: MintJob,
            feeCharged: string,
            returnValueXDR: string | undefined
        } = await req.json() as any

        const cost = new BigNumber(await this.storage.get('cost') || 0).plus(feeCharged).toString()

        await this.storage.put('cost', cost)

        switch (mintJob.type) {
            case 'mine':
                await this.mineProgress(body)
                break;
            case 'mint':
                if (mintJob.width)
                    await this.mintComplete(body)
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
        // Look up the next `mint_job` and queue it then update the `mint_job` with that job removed
        const mineJobs: MintJob[] = await this.storage.get('mine_jobs') || []
        const mineTotal: number = await this.storage.get('mine_total') || mineJobs.length
        const mineJob = mineJobs.shift()

        await this.storage.put('mine_progress', mineTotal - mineJobs.length)

        if (mineJob) {
            await this.env.TX_SEND.send(mineJob)
            await this.storage.put('mine_jobs', mineJobs)
        }

        // mining is done, move on to minting
        else {
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
                    || map.size >= (count === 1 ? maxMintSize : maxMintSize - 1)
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
                hash: body.hash,
            }))

            // Kick off the first mint job
            const mintJob = mintJobs.shift()!

            await this.storage.put('mint_jobs', mintJobs)
            await this.env.TX_SEND.send(mintJob)
            await this.storage.delete('mine_jobs')
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
                hash: body.hash,
                width: body.width,
            }

            await this.env.TX_SEND.send(mintJob)
            await this.storage.delete('mint_jobs')
        }
    }
    async mintComplete(body: any) {
        const fee = await this.storage.get('cost')

        await this.env.DB.prepare(`
            UPDATE Glyphs
            SET Fee = ?2
            WHERE "Hash" = ?1 AND (Fee IS NULL OR Fee <> ?2)
        `)
            .bind(body.hash, fee)
            .run();

        await this.flushAll()
    }
}