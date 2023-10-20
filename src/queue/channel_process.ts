import { StatusError } from "itty-router"
import { horizon, networkPassphrase, oceanKp } from "./common"
import { Account, Keypair, Operation, TimeoutInfinite, Transaction, TransactionBuilder } from "soroban-client"

export async function channelProcess(messages: Message<ChannelJob>[], env: Env, ctx: ExecutionContext) {
    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
    const stub = env.CHANNEL_ACCOUNT.get(id)
    const ocean_pubkey = oceanKp.publicKey()
    const res: any = await horizon.get(`/accounts/${ocean_pubkey}`)
    const source = new Account(ocean_pubkey, res.sequence)
    const created: string[] = []
    const merged: string[] = []

    let transaction: TransactionBuilder | Transaction = new TransactionBuilder(source, {
        fee: (10_000_000).toString(),
        networkPassphrase,
    })

    for (const message of messages) {
        const body = message.body

        // TODO save all channels to a KV so we absolutely never lose funded accounts
        // use a cron task to keep that KV list pruned

        switch (body.type) {
            case 'create':
                created.push(body.channel)
                transaction.addOperation(Operation.createAccount({
                    destination: Keypair.fromSecret(body.channel).publicKey(),
                    startingBalance: '10',
                }))
                break;
            case 'merge':
                merged.push(body.channel)
                transaction.addOperation(Operation.accountMerge({
                    destination: ocean_pubkey,
                    source: Keypair.fromSecret(body.channel).publicKey(),
                }))
                break;
            default:
                throw new StatusError(404, `Type ${body.type} not found`)
        }
    }

    transaction = transaction
        .setTimeout(TimeoutInfinite)
        .build()

    for (const channel of merged) {
        transaction.sign(Keypair.fromSecret(channel))
    }

    transaction.sign(oceanKp)

    const tx = new FormData()
    tx.append('tx', transaction.toXDR())

    await horizon.post('/transactions', tx)
        .then((res) => console.log(res))

    // If tx submission was successful add these channels to our available channels list
    for (const channel of created) {
        try {
            await stub
            .fetch(`http://fake-host/return/${channel}`, {method: 'PUT'})
            .then((res) => {
                if (res.ok) return
                else throw new StatusError(res.status, res.statusText)
            })
        } catch(err) {
            console.log(`!! we created channels that weren't saved !!`, channel)
            // TODO don't retry at this point, just save this error by any means possible so we get the channel
        }
    }
}