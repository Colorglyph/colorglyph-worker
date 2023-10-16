import { StatusError } from "itty-router"
import { processMine } from "./process_mine"
import { processMint } from "./process_mint"
import { processTx } from "./process_tx"

export async function processQueue(batch: MessageBatch<any>, env: Env) {
    switch (batch.queue) {
        case 'colorglyph-tx-queue':
            for (let message of batch.messages) {
                await processTx(message, env)
            }
            break;

        case 'colorglyph-mint-queue':
            for (let message of batch.messages) {
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
            }
            break;

        default:
            throw new StatusError(400, `Unknown queue: ${batch.queue}`)
    }
}