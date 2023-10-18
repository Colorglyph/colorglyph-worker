import { StatusError } from "itty-router"
import { processMine } from "./process_mine"
import { processMint } from "./process_mint"
import { processTx } from "./process_tx"

export async function processQueue(batch: MessageBatch<any>, env: Env) {
    if (batch.messages.length > 1)
        throw new StatusError(400, `Batch size > 1 not supported`)

    const message = batch.messages[0]

    switch (batch.queue) {
        case 'colorglyph-tx-queue':
            await processTx(message, env)
            break;

        case 'colorglyph-mint-queue':
            switch (message.body.type) {
                case 'mine':
                    await processMine(message, env)
                    break;

                case 'mint':
                    await processMint(message, env)
                    break;

                default:
                    throw new StatusError(400, `Unknown message: ${message.body.type}`)
            }
            break;

        default:
            throw new StatusError(400, `Unknown queue: ${batch.queue}`)
    }
}