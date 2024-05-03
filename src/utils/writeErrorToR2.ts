import { SorobanRpc } from '@stellar/stellar-sdk'
import { Config } from "../queue/common"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function writeErrorToR2(
    body: MintJob, 
    tx: string | SorobanRpc.Api.SimulateTransactionErrorResponse | SorobanRpc.Api.SimulateTransactionSuccessResponse, 
    env: Env, 
    extra?: string
) {
    const existing = await env.ERRORS.get(body.id)

    let data: Uint8Array

    if (typeof tx === 'string') {
        const { rpc } = new Config(env)
        
        const res_string = await rpc._getTransaction(tx) // _getTransaction so it's a nice clean raw response
            .then((res) => JSON.stringify(res, null, 2))

        data = encoder.encode(`${await existing?.text()}\n\n${tx}\n\n${res_string}\n\n${extra}`)
    }

    else {
        let events = ''

        for (const event of tx.events) {
            if (event.event().type().name === 'diagnostic')
                events += `\n\n${event.event().body().toXDR('base64')}`
        }

        if (SorobanRpc.Api.isSimulationError(tx)) { // Error, Raw, Restore
            data = encoder.encode(`${await existing?.text()}\n\n${events}\n\n${tx.error}\n\n${extra}`)    
        } else {
            const txData = tx.transactionData.build();
            const fees = {
                resourceFee: txData.resourceFee().toString(),
                cost: {
                    cpuInsns: tx.cost.cpuInsns,
                    memBytes: tx.cost.memBytes,
                },
                resources: {
                    instructions: txData.resources().instructions(),
                    readBytes: txData.resources().readBytes(),
                    writeBytes: txData.resources().writeBytes(),
                },
            }

            data = encoder.encode(`${await existing?.text()}\n\n${events}\n\n${JSON.stringify(fees, null, 2)}\n\n${extra}`)
        }        
    }

    console.log(decoder.decode(data));

    await env.ERRORS.put(body.id, data)
}