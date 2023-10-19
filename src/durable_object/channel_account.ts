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
import { Keypair } from 'soroban-client'
import { fetcher } from 'itty-fetcher'

const horizon = fetcher({ base: 'https://horizon-futurenet.stellar.org' })

// TODO I'm not convinced we can't end up in a place where we have stuck busy channels that will never be returned to the pool
// For example when a DO dies for things like CPU/MEM or even just a code push and the process never resolves and thus the busy channel is never returned

// TODO We should place caps on channel arrays so these things don't grow unbounded somehow
// They can be high but they should be capped

// TODO should we save errors from this DO? Probably

export class ChannelAccount {
    env: Env
    storage: DurableObjectStorage
    state: DurableObjectState
    id: DurableObjectId
    router: RouterType
    available_channels: string[]

    constructor(state: DurableObjectState, env: Env) {
        this.id = state.id
        this.env = env
        this.storage = state.storage
        this.state = state
        this.router = Router()
        this.available_channels = []

        this.router
            .get('/debug', this.debug.bind(this))
            .delete('/:type/:secret', this.removeChannel.bind(this))
            .get('/take', this.takeChannel.bind(this))
            .put('/return/:secret', this.returnChannel.bind(this))
            .all('*', () => error(404))

        state.blockConcurrencyWhile(async () => {
            this.available_channels = await this.storage.get('available') || []
        })
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

    async debug(req: IRequestStrict) {
        const available = await this.storage.get('available')

        return json({
            id: this.id.toString(),
            available,
        })
    }
    async removeChannel(req: IRequestStrict) {
        let channel_array: string[]

        switch (req.params.type) {
            case 'available':
                channel_array = this.available_channels
                break;
            default:
                throw new StatusError(404, 'Type not found')
        }

        const index = channel_array.findIndex((channel) => channel === req.params.secret)

        if (index === -1)
            throw new StatusError(404, 'Channel not found')

        channel_array.splice(index, 1)

        await this.storage.put(req.params.type, channel_array)

        return status(204)
    }
    async takeChannel(req: IRequestStrict) {
        if (!this.available_channels.length) {
            await this.env.CHANNEL_PROCESS.send({
                type: 'create',
                channel: Keypair.random().secret()
            })
            throw new StatusError(400, 'No channels available')
        }

        let channel: string

        // Loop over all available channels until we find one with sufficient balance to use
        while (this.available_channels.length) {
            channel = this.available_channels.shift()!
            const pubkey = Keypair.fromSecret(channel).publicKey()

            const res: any = await horizon.get(`/accounts/${pubkey}`)
            const { balance } = res.balances.find(({ asset_type }: any) => asset_type === 'native')

            if (Number(balance) < 2) // if we have < {x} XLM we shouldn't use this channel account // TODO probably should be a bit more than 2 XLM
                await this.env.CHANNEL_PROCESS.send({
                    type: 'merge',
                    channel
                })
            else
                return text(channel)
        }

        // All available channels were low on balance so we're back to needing to create
        await this.env.CHANNEL_PROCESS.send({
            type: 'create',
            channel: Keypair.random().secret()
        })
        throw new StatusError(400, 'No channels available')
    }
    async returnChannel(req: IRequestStrict) {
        this.available_channels.push(req.params.secret)
        await this.storage.put('available', this.available_channels)

        return status(204)
    }
}