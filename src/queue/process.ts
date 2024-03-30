import { StatusError } from "itty-router"
import { sendTx } from "./send_tx"
import { getTx } from "./get_tx"

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
        default:
            throw new StatusError(404, `Queue ${batch.queue} not found`)
    }
}