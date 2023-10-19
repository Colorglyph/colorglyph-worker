import { StatusError } from "itty-router"
import { sendTx } from "./send_tx"
import { getTx } from "./get_tx"

// TODO I actually think we should move the mint-queue stuff into a single tx-queue
// I don't actually think it's neccessary to have two queues

export async function processQueue(batch: MessageBatch<MintJob>, env: Env, ctx: ExecutionContext) {
    if (batch.messages.length > 1)
        throw new StatusError(400, `Batch size > 1 not supported`)

    const message = batch.messages[0]

    switch (batch.queue) {
        case 'colorglyph-tx-send':
            await sendTx(message, env, ctx)
            break;

        case 'colorglyph-tx-get':
            await getTx(message, env, ctx)
            break;

        case 'colorglyph-tx-get-dlq':
            const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
            const stub = env.CHANNEL_ACCOUNT.get(id)
            
            // return the channel
            ctx.waitUntil(stub.fetch(`http://fake-host/return/${message.body.channel}`))

            // re-queue the tx
            await env.TX_SEND.send(message)
            break;

        default:
            throw new StatusError(404, `Queue not found: ${batch.queue}`)
    }
}