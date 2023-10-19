import { xdr, Keypair, Operation, TransactionBuilder } from 'soroban-client'
import { server, networkPassphrase, sleep } from './common'
import { getRandomNumber } from '../utils'
import { mineOp } from './mine_op'
import { mintOp } from './mint_op'
import { StatusError } from 'itty-router'

export async function sendTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext) {
    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1') // Hard coded because we need to resolve to the same DO app wide
    const stub = env.CHANNEL_ACCOUNT.get(id)

    let channel!: string

    try {
        const body = message.body

        // TODO everywhere we're using stub.fetch we don't have the nice error handling that fetcher gives us so we need to roll our own error handling. 
        // Keep in mind though there are instances where failure shouldn't kill the whole task. Think returning a channel that's not currently busy for whatever reason
        await stub
            .fetch('http://fake-host/take')
            .then(async (res) => {
                if (res.ok)
                    channel = await res.text()
                else
                    throw await res.json()
            })

        const kp = Keypair.fromSecret(channel)
        const pubkey = kp.publicKey()

        let operation: xdr.Operation<Operation.InvokeHostFunction>

        switch (body.type) {
            case 'mine':
                operation = await mineOp(message, env)
                break;
            case 'mint':
                operation = await mintOp(message, env)
                break;
        }

        const source = await server.getAccount(pubkey)
        const preTx = new TransactionBuilder(source, {
            fee: (getRandomNumber(1_000_000, 10_000_000)).toString(), // TODO we should be smarter about this (using random so at least we have some variance)
            networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(30) // 30 seconds. Just needs to be less than the NOT_FOUND retry limit so we never double send
            .build()

        // TEMP we likely don't need to simulate again but currently there are cases with multiauth where the initial simulation doesn't account for the authorized operation
        const readyTx = await server.prepareTransaction(preTx)

        // TODO catch error here and log it to R2 as this involves a simulation
        // rare to catch here due to the fact we're simulating prior to this. but still

        readyTx.sign(kp)

        const subTx = await server.sendTransaction(readyTx)

        switch (subTx.status) {
            case 'PENDING':
                console.log(subTx)

                await sleep(1) // Throttle TX_SEND to 1 successfully sent tx per second
                await env.TX_GET.send({
                    ...body, // send along the `body` in case we need to re-queue later
                    hash: subTx.hash,
                    channel // send along the channel secret so we can return it to the pool later
                })

                break;
            default: 
                console.log(subTx)

                // save the error
                const existing = await env.ERRORS.get(body.id)

                const encoder = new TextEncoder()
                const data = encoder.encode(`${await existing?.text()}\n\n${subTx.hash}\n\n${subTx.errorResult?.toXDR('base64')}`)

                await env.ERRORS.put(body.id, data)

                if (subTx.status !== 'DUPLICATE') {
                    // this will ensure a retry
                    // we throw vs `message.retry()` because we want to return the channel account
                    throw new StatusError(400, subTx.status)
                }
        }
    } catch (err) {
        console.error(err)

        // TODO save the error?
        // maybe in Sentry as this won't be Stellar/Soroban specific

        // return the channel account
        if (channel)
            await stub.fetch(`http://fake-host/return/${channel}`, {method: 'PUT'})

        // Wait 5 seconds before retrying
        await sleep(5)
        message.retry()
    }
}