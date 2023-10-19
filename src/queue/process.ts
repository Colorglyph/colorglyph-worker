import { StatusError } from "itty-router"
import { sendTx } from "./send_tx"
import { getTx } from "./get_tx"
import { channelProcess } from "./channel_process"

// TODO I actually think we should move the mint-queue stuff into a single tx-queue
// I don't actually think it's neccessary to have two queues

export async function processQueue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext) {
    switch (batch.queue) {
        case 'colorglyph-channel-process':
        case 'colorglyph-channel-process-dlq':
            await channelProcess(batch.messages as Message<ChannelJob>[], env, ctx)
            break;

        case 'colorglyph-tx-get':
            for (const message of batch.messages) {
                await getTx(message, env, ctx)   
            }
            break;

        default:
            if (batch.messages.length > 1)
                throw new StatusError(400, `Batch size > 1 not supported`)

            const message = batch.messages[0] as Message<MintJob>

            switch (batch.queue) {
                case 'colorglyph-tx-send':
                    await sendTx(message, env, ctx)
                    break;
        
                case 'colorglyph-tx-get-dlq':
                    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
                    const stub = env.CHANNEL_ACCOUNT.get(id)
                    
                    // return the channel
                    await stub.fetch(`http://fake-host/return/${message.body.channel}`, {method: 'PUT'})
        
                    // re-queue the tx
                    await env.TX_SEND.send(message.body)
                    break;

                default:
                    throw new StatusError(404, `Queue not found`)
            }
    }
}