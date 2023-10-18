import { Keypair, TransactionBuilder } from 'soroban-client'
import { server, networkPassphrase } from './common'
import { StatusError } from 'itty-router'
import { getRandomNumber } from '../utils'

export async function processTx(message: Message<MintJob>, env: Env) {
    const hash = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1') // Hard coded because we need to resolve to the same DO app wide
    const stub = env.CHANNEL_ACCOUNT.get(hash)

    let secret: string | undefined

    try {
        const body = message.body

        if (!body.tx)
            throw new StatusError(400, 'Missing tx')

        // TODO everywhere we're using stub.fetch we don't have the nice error handling that fetcher gives us so we need to roll our own error handling. 
        // Keep in mind though there are instances where failure shouldn't kill the whole task. Think returning a channel that's not currently busy for whatever reason
        await stub.fetch('http://fake-host/take')
        .then(async (res) => {
            if (res.ok)
                secret = await res.text()
            else 
                throw await res.json()
        })

        const kp = Keypair.fromSecret(secret!)
        const pubkey = kp.publicKey()

        const tx = TransactionBuilder.fromXDR(body.tx, networkPassphrase)

        const source = await server.getAccount(pubkey)
        const preTx = new TransactionBuilder(source, {
            fee: (getRandomNumber(1_000_000, 10_000_000)).toString(), // TODO we should be smarter about this (using random so at least we have some variance)
            networkPassphrase,
        })
            .addOperation(tx.toEnvelope().v1().tx().operations()[0])
            .setTimeout(30) // 30 seconds. Just needs to be less than the NOT_FOUND retry limit so we never double send
            .build()

        const readyTx = await server.prepareTransaction(preTx)

        readyTx.sign(kp)

        await new Promise((resolve) => setTimeout(resolve, 1000)) // Throttle TX_QUEUE to 1 tx per second
        const subTx = await server.sendTransaction(readyTx)

        switch (subTx.status) {
            case 'PENDING':
                console.log(subTx)

                const hash = env.MINT_FACTORY.idFromString(body.id)

                await env.MINT_FACTORY
                    .get(hash)
                    .fetch(`http://fake-host/${subTx.hash}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            ...body, // send along the `body` in case we need to re-queue later
                            channel: secret // send along the channel secret so we can return it to the pool later
                        })
                    })
                    
                break;
            default: // DUPLICATE | TRY_AGAIN_LATER | ERROR
                console.log(subTx)

                // save the error
                const existing = await env.ERRORS.get(body.id)

                const encoder = new TextEncoder()
                const data = encoder.encode(`${await existing?.text()}\n\n${subTx.errorResult?.toXDR('base64')}`)

                await env.ERRORS.put(body.id, data)

                // TODO there's more work that needs to go into queuing up transactions that have error'ed for recoverable things like sequence number or insufficient fee vs things like the account missing or other unrecoverable issues

                throw new StatusError(400, subTx.status)
        }
    } catch(err) {
        console.error(JSON.stringify(err, null, 2))

        // return the channel account
        if (secret)
            await stub.fetch(`http://fake-host/return/${secret}`)

        // Wait 5 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000))
        message.retry()
    }
}