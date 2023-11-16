import { SorobanRpc } from "stellar-sdk"
import { server } from "../queue/common"

const encoder = new TextEncoder()

export async function writeErrorToR2(body: MintJob, tx: string | SorobanRpc.Api.SimulateTransactionErrorResponse, env: Env) {
    const existing = await env.ERRORS.get(body.id)

    let data: Uint8Array

    if (typeof tx === 'string') {
        // TEMP while we wait for `soroban-client` -> `server.getTransaction` -> `FAILED` to send more complete data
        const res_string = await server._getTransaction(tx)
            .then((res) => JSON.stringify(res))

        console.log(tx, res_string)

        data = encoder.encode(`${await existing?.text()}\n\n${tx}\n\n${res_string}`)
    }

    else {
        console.log(tx.error)

        let events = ''

        for (const event of tx.events) {
            events += `\n\n${event.toXDR('base64')}`
        }

        data = encoder.encode(`${await existing?.text()}\n\n${events}\n\n${tx.error}`)
    }

    await env.ERRORS.put(body.id, data)
}