import { Account, Keypair, Operation, StrKey, TimeoutInfinite, TransactionBuilder, xdr } from 'soroban-client'
import { authorizeEntry } from 'stellar-base'
import { Contract, RawContract, networkPassphrase, server } from './common'

export async function processMint(message: Message<any>, env: Env) {
    const body: MintJob = message.body
    const kp = Keypair.fromSecret(body.secret)
    const pubkey = kp.publicKey()
    const { contract: Colorglyph } = new Contract(kp)

    // TODO requires the colors being used to mint have been mined by the secret (pubkey hardcoded)
    const mintMap = body.palette.length
        ? new Map([[pubkey, new Map(body.palette as [number, number[]][])]])
        : new Map()

    const args = Colorglyph.spec.funcArgsToScVals('glyph_mint', {
        minter: pubkey,
        to: undefined,
        colors: mintMap,
        width: body.width,
    })

    const operation = RawContract.call(
        'glyph_mint',
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
    // const currentLedger = await server.getLatestLedger()
    // const validUntilLedger = currentLedger.sequence + 10000

    // TODO handle sim errors

    // Because we're doing signing here it may make sense to keep this in a queue vs back in the DO
    const authEntry = await authorizeEntry(
        // @ts-ignore
        simTx.result.auth[0],
        kp,
        12 * 60 * 24 * 31,
        networkPassphrase,
    )

    const operationAuthorized = Operation.invokeHostFunction({
        // @ts-ignore
        func: operation.body().value().hostFunction(),
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
        ...body,
        tx: txAuthorized.toXDR(),
    })
}