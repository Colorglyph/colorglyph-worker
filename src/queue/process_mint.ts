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

    // Because we're doing signing here it may make sense to keep this in a queue vs back in the DO
    const authEntry = await authorizeEntry(
        // @ts-ignore
        simTx.result.auth[0], // TODO not sure if sniping the first auth as the only auth is the right thing to do here
        kp,
        12 * 60 * 24 * 31, // TODO a year's worth of ledgers. Don't love this
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
        ...body, // TODO in general I don't think we need to pass around much more than the DO id to queue tasks since we can look up the data from the DO itself when processing the task (other than the chunked palette I guess, which is important in case of re-qeueus)
        tx: txAuthorized.toXDR(), // TODO even this bit might be better generated in the tx queue task. Maybe not though as we need to know what chunk to submit in the tx vs actually generating the next chunk as we don't really need to mine or mint progressively we just need to mine before we mint and fully mint before we finally mint. We also need to sign which is memory intensive so getting this out on its own is probably wise
    })
}