import { Keypair, TransactionBuilder, TimeoutInfinite, Operation } from 'soroban-client'
import { server, networkPassphrase } from './common'
import { StatusError } from 'itty-router'
import { getRandomNumber } from '../utils'

export async function processTx(message: Message<any>, env: Env) {
    try {
        const body: MintJob = message.body

        if (!body.tx)
            throw new StatusError(400, 'Missing tx')

        const hash = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1') // Hard coded because we need to resolve to the same DO app wide
        const stub = env.CHANNEL_ACCOUNT.get(hash)

        const res = await stub.fetch('http://fake-host/take') // TODO everywhere we're using stub.fetch we don't have the nice error handling that fetcher gives us so we need to roll our own error handling 
        const secret = await res.text()

        // TODO it's very probably here we will run into times of channel account famime, and we need a clean way to deal with that, either timing out, just waiting for the dlq and subsequent cron restart, or something
        // await stub.fetch(`http://fake-host/return/${secret}`) // TEMP so we don't run out of channels. Ultimately this shouldn't be returned until the tx is fully resolved either in success or failure

        const kp = Keypair.fromSecret(secret)
        const pubkey = kp.publicKey()

        const tx = TransactionBuilder.fromXDR(body.tx, networkPassphrase)

        const source = await server.getAccount(pubkey)
        const preTx = new TransactionBuilder(source, {
            fee: (getRandomNumber(1_000_000, 10_000_000)).toString(), // TODO we should be smarter about this (using random so at least we have some variance)
            networkPassphrase,
        })
            // @ts-ignore
            .addOperation(Operation.invokeHostFunction(tx.operations[0]))
            .setTimeout(TimeoutInfinite)
            .build()

        const readyTx = await server.prepareTransaction(preTx)

        readyTx.sign(kp)

        await new Promise((resolve) => setTimeout(resolve, 1000)) // Throttle TX_QUEUE to 1 tx per second
        const subTx = await server.sendTransaction(readyTx)

        switch (subTx.status) {
            case 'PENDING':
                console.log(subTx)

                const hash = env.MINT_FACTORY.idFromString(body.id)

                return env.MINT_FACTORY
                    .get(hash)
                    .fetch(`http://fake-host/${subTx.hash}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            ...body, // send along the `body` in case we need to re-queue later
                            channel: secret // send along the channel secret so we can return it to the pool later
                        })
                    })
            default: // DUPLICATE | TRY_AGAIN_LATER | ERROR
                console.log(subTx)

                // TODO 
                // there's more work that needs to go into queuing up transactions that have error'ed for recoverable things like sequence number or insufficient fee vs things like the account missing or other unrecoverable issues

                // return the channel account
                await stub.fetch(`http://fake-host/return/${secret}`)

                throw new StatusError(400, subTx.status)
        }
    } catch(err) {
        // Wait 5 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000))
        message.retry()
    }
}