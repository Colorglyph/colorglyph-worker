import { StatusError } from "itty-router"
// import { processMine } from "./process_mine"
// import { processMint } from "./process_mint"
import { processTx } from "./process_tx"

// TODO I actually think we should move the mint-queue stuff into a single tx-queue
// I don't actually think it's neccessary to have two queues

export async function processQueue(batch: MessageBatch<MintJob>, env: Env) {
    if (batch.messages.length > 1)
        throw new StatusError(400, `Batch size > 1 not supported`)

    const message = batch.messages[0]

    switch (batch.queue) {
        case 'colorglyph-tx-queue':
            await processTx(message, env)
            break;

        // case 'colorglyph-mint-queue':
        //     switch (message.body.type) {
        //         case 'mine':
        //             await processMine(message, env)
        //             break;

        //         case 'mint':
        //             await processMint(message, env)
        //             break;

        //         default:
        //             throw new StatusError(404, `Message type not found: ${message.body.type}`)
        //     }
        //     break;

        default:
            throw new StatusError(404, `Queue not found: ${batch.queue}`)
    }
}