import { xdr, Keypair, TransactionBuilder, TimeoutInfinite, Account, Operation, StrKey, SorobanRpc } from 'soroban-client'
import { server, networkPassphrase, Contract, RawContract } from './common'
import { authorizeEntry } from 'stellar-base'
import { sortMapKeys } from '../utils'
import { StatusError } from 'itty-router'

export async function processMine(message: Message<any>, env: Env) {
    const body: MintJob = message.body
    const kp = Keypair.fromSecret(body.secret)
    const pubkey = kp.publicKey()
    const { contract: Colorglyph } = new Contract(kp)

    let colors = new Map((body.palette as [number, number][]).map(([color, amount]) => [color, amount]))
        colors = sortMapKeys(colors)

    const args = Colorglyph.spec.funcArgsToScVals('colors_mine', {
        miner: pubkey, 
        to: undefined, 
        colors: new Map(colors)
    })
    
    const operation = RawContract.call(
        'colors_mine',
        ...args
    )

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
        console.error(simTx)
        throw new StatusError(400, 'Simulation failed')
    }

    const currentLedger = await server.getLatestLedger()
    const validUntilLedger = currentLedger.sequence + (12 * 60 * 24) // TODO a days worth of ledgers?

    // Because we're doing signing here it may make sense to keep this in a queue vs back in the DO
    const authEntry = await authorizeEntry(
        simTx.result!.auth[0], // TODO not sure if sniping the first auth as the only auth is the right thing to do here
        kp,
        validUntilLedger,
        networkPassphrase,
    )

    const operationAuthorized = Operation.invokeHostFunction({
        func: operation.body().invokeHostFunctionOp().hostFunction(),
        auth: [ 
            // authEntry
            xdr.SorobanAuthorizationEntry.fromXDR(authEntry.toXDR()) // Needed as long as we're mixing XDR from `stellar-base` and `soroban-client`
        ]
    })

    let txAuthorized = TransactionBuilder
        .cloneFrom(tx)
        .clearOperations()
        .addOperation(operationAuthorized)
        .setTimeout(TimeoutInfinite)
        .build()

    // Send this to the transaction submission queue
    await env.TX_QUEUE.send({
        ...body, // NOTE in general I don't think we need to pass around much more than the DO id to queue tasks since we can look up the data from the DO itself when processing the task (other than the chunked palette I guess, which is important in case of re-qeueus)
        tx: txAuthorized.toXDR(), // NOTE even this bit might be better generated in the tx queue task. Maybe not though as we need to know what chunk to submit in the tx vs actually generating the next chunk as we don't really need to mine or mint progressively we just need to mine before we mint and fully mint before we finally mint. We also need to sign which is memory intensive so getting this out on its own is probably wise
    })
}