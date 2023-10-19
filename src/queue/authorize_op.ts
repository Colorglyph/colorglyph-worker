import { StatusError } from "itty-router"
import { Account, Keypair, Operation, SorobanRpc, StrKey, TimeoutInfinite, TransactionBuilder, authorizeEntry, xdr } from "soroban-client"
import { networkPassphrase, server } from "./common"

export async function authorizeOperation(
    body: MintJob, 
    operation: xdr.Operation<Operation.InvokeHostFunction>, 
    kp: Keypair, 
    env: Env
) {
    const source = new Account(StrKey.encodeEd25519PublicKey(Buffer.alloc(32)), '0') // Need to use a random source other than pubkey so the credientals are filled in the `authorizeEntry`
    const tx = new TransactionBuilder(source, {
        fee: '0',
        networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(TimeoutInfinite)
        .build()

    const simTx = await server.simulateTransaction(tx)

    if (!SorobanRpc.isSimulationSuccess(simTx)) {
        console.log(simTx)

        // save the error
        const existing = await env.ERRORS.get(body.id)

        let events = ''

        for (const event of simTx.events) {
            events += `\n\n${event.event().toXDR('base64')}`
        }

        const encoder = new TextEncoder()
        const data = encoder.encode(`${await existing?.text()}\n\n${events}\n\n${simTx.error}`)

        await env.ERRORS.put(body.id, data)

        throw new StatusError(400, 'Simulation failed')
    }

    const currentLedger = await server.getLatestLedger()
    const validUntilLedger = currentLedger.sequence + (12 * 60 * 24)

    // Because we're doing signing here it may make sense to keep this in a queue vs back in the DO
    const authEntry = await authorizeEntry(
        simTx.result!.auth[0],
        kp,
        validUntilLedger,
        networkPassphrase,
    )

    const operationAuthorized = Operation.invokeHostFunction({
        func: operation.body().invokeHostFunctionOp().hostFunction(),
        auth: [ authEntry ]
    })

    return operationAuthorized
}