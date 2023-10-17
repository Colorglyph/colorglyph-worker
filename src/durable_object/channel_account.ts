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
import { Account, Keypair, Operation, TimeoutInfinite, Transaction, TransactionBuilder } from 'stellar-base'
import { fetcher } from 'itty-fetcher'
import { networkPassphrase } from '../queue/common'

const horizon = fetcher({ base: 'https://horizon-futurenet.stellar.org' })

// TODO I'm not convinced we can't end up in a place where we have stuck busy channels that will never be returned to the pool

// TODO We should place caps on channel arrays so these things don't grow unbounded somehow
// They can be high but they should be capped

export class ChannelAccount {
    env: Env
    storage: DurableObjectStorage
    id: DurableObjectId
    router: RouterType
    available_channels: string[] = []
    busy_channels: string[] = []
    create_channels: string[] = []
    mergeable_channels: string[] = []
    ocean_kp: Keypair = Keypair.fromSecret('SAJR6ISVN7C5AP6ICU7NWP2RZUSSCIG3FMPD66WJWUA23REZGH66C4TE')
    creating: boolean = false
    merging: boolean = false

    constructor(state: DurableObjectState, env: Env) {
        this.id = state.id
        this.storage = state.storage
        this.env = env
        this.router = Router()

        this.router
            .get('/', this.debug.bind(this))
            .get('/take', this.takeChannel.bind(this))
            .get('/return/:secret', this.returnChannel.bind(this))
            .all('*', () => error(404))

        state.blockConcurrencyWhile(async () => {
            this.available_channels = await this.storage.get('available') || []
            this.busy_channels = await this.storage.get('busy') || []
            this.mergeable_channels = await this.storage.get('mergeable') || []
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
        const busy = await this.storage.get('busy')
        const mergeable = await this.storage.get('mergeable')

        return json({
            id: this.id.toString(),
            pubkey: this.ocean_kp.publicKey(),
            available,
            busy,
            mergeable
        })
    }
    async takeChannel(req: IRequestStrict) {
        if (this.available_channels.length === 0) {
            this.create_channels.push(Keypair.random().secret())
            this.createChannels() // trigger the creation of new channels but async
            throw new StatusError(400, 'No channels available')
        }

        const [secret] = this.available_channels.splice(0, 1)
        await this.storage.put('available', this.available_channels)

        const pubkey = Keypair.fromSecret(secret).publicKey()
        const res: any = await horizon.get(`/accounts/${pubkey}`)
        const { balance } = res.balances.find(({ asset_type }: any) => asset_type === 'native')

        if (Number(balance) < 2) { // if we have < {x} XLM we shouldn't use this channel account // TODO probably should be a bit more than 2 XLM
            this.mergeable_channels.push(secret)
            await this.storage.put('mergeable', this.mergeable_channels)
            this.mergeChannels() // trigger the merging of channels but async
            throw new StatusError(400, 'Insufficient channel funds')
        } else {
            this.busy_channels = [...this.busy_channels, secret]
            await this.storage.put('busy', this.busy_channels)
        }

        return text(secret)
    }
    async returnChannel(req: IRequestStrict) {
        const secret = req.params.secret
        const index = this.busy_channels.findIndex((channel) => channel === secret)

        if (index === -1)
            throw new StatusError(400, 'Channel not busy')

        this.busy_channels.splice(index, 1)
        await this.storage.put('busy', this.busy_channels)

        this.available_channels = [...this.available_channels, secret]
        await this.storage.put('available', this.available_channels)

        return status(204)
    }

    // TODO there's a lot of repeated code between these two functions. We should probably refactor this to be more DRY

    async createChannels() {
        try {
            // Only one create channels tx at a time, otherwise we hit sequence number issues
            if (
                this.creating 
                || this.merging
            ) return

            this.creating = true

            const ocean_pubkey = this.ocean_kp.publicKey()

            const res: any = await horizon.get(`/accounts/${ocean_pubkey}`)
            const source = new Account(ocean_pubkey, res.sequence)

            let transaction: TransactionBuilder | Transaction = new TransactionBuilder(source, {
                fee: (10_000_000).toString(),
                networkPassphrase,
            })

            // Grab up to 100 new channels
            const channels = this.create_channels.splice(0, 100)

            // Create the channel accounts
            for (const channel of channels) {
                transaction.addOperation(Operation.createAccount({
                    destination: Keypair.fromSecret(channel).publicKey(),
                    startingBalance: '10',
                }))
            }

            transaction = transaction
                .setTimeout(TimeoutInfinite)
                .build()

            transaction.sign(this.ocean_kp)

            const tx = new FormData()
            tx.append('tx', transaction.toXDR())

            await horizon.post('/transactions', tx)

            // If tx submission was successful add these channels to our available channels list
            this.available_channels.push(...channels)

            this.creating = false

            // If we have more to create still then go ahead and create them
            if (this.create_channels.length)
                this.createChannels()
        } catch (err) {
            console.error(JSON.stringify(err, null, 2))
            this.creating = false
        }
    }
    async mergeChannels() {
        try {
            // Only one merge channels tx at a time, otherwise we hit sequence number issues
            if (
                this.merging
                || this.creating
            ) return

            this.merging = true

            const ocean_pubkey = this.ocean_kp.publicKey()

            const res: any = await horizon.get(`/accounts/${ocean_pubkey}`)
            const source = new Account(ocean_pubkey, res.sequence)

            let transaction: TransactionBuilder | Transaction = new TransactionBuilder(source, {
                fee: (10_000_000).toString(),
                networkPassphrase,
            })

            // Grab up to 10 new channels (only 10 because we have to sign for all of them)
            const channels = this.mergeable_channels.splice(0, 10)
            await this.storage.put('mergeable', this.mergeable_channels)

            // Merge the channel accounts
            for (const channel of channels) {
                transaction.addOperation(Operation.accountMerge({
                    destination: ocean_pubkey,
                    source: Keypair.fromSecret(channel).publicKey(),
                }))
            }

            transaction = transaction
                .setTimeout(TimeoutInfinite)
                .build()

            for (const channel of channels) {
                transaction.sign(Keypair.fromSecret(channel))
            }

            transaction.sign(this.ocean_kp)

            const tx = new FormData()
            tx.append('tx', transaction.toXDR())

            try {
                await horizon.post('/transactions', tx)

                this.merging = false

                // If we have more to merge still then go ahead and merge them
                if (this.mergeable_channels.length)
                    this.mergeChannels()
            } catch(err) {
                console.error(JSON.stringify(err, null, 2))
                this.mergeable_channels.push(...channels) // put the channels back in the queue
                await this.storage.put('mergeable', this.mergeable_channels)
            }
        } catch (err) {
            console.error(JSON.stringify(err, null, 2))
            this.merging = false
        }
    }
}