import { Keypair, TransactionBuilder, TimeoutInfinite, Account, Operation, SorobanRpc } from 'soroban-client'
import { server, networkPassphrase, Contract, RawContract } from './common'
import { StatusError } from 'itty-router'
import { getRandomNumber } from '../utils'

export async function processTx(message: Message<any>, env: Env) {
    const body: MintJob = message.body // TODO make this (these, they're everywhere) a proper type

    if (!body.tx)
        throw new StatusError(400, 'Missing tx')

    const hash = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1') // Hard coded because we need to resolve to the same DO app wide
    const stub = env.CHANNEL_ACCOUNT.get(hash)

    const res = await stub.fetch('http://fake-host/take')
    const secret = await res.text()

    // TODO it's very probably here we will run into times of channel account famime, and we need a clean way to deal with that, either timing out, just waiting for the dlq and subsequent cron restart, or something
    await stub.fetch(`http://fake-host/return/${secret}`) // TEMP so we don't run out of channels. Ultimately this shouldn't be returned until the tx is fully resolved either in success or failure

    const kp = Keypair.fromSecret(secret)
    const pubkey = kp.publicKey()

    const tx = TransactionBuilder.fromXDR(body.tx, networkPassphrase)

    const source = await server.getAccount(pubkey)
    const preTx = new TransactionBuilder(source, {
        fee: (getRandomNumber(1_000_000, 10_000_000)).toString(), // TODO we should be smarter about this (using random so at least we have some variance)
        networkPassphrase,
    })
    // @ts-ignore
    .addOperation(Operation.invokeHostFunction(tx.operations[0]))
    .setTimeout(TimeoutInfinite)
    .build()

    ///
    // Solved a bug where the bytes write was increasing causing failure
    // This is due to the fact that success in the past caused an unbound storage key to grow
    // Which in turn causes future pushes to that storage key to require more bytes 🧠

    // const simTx = await server.simulateTransaction(preTx)

    // console.log(
    //     'simTx SorobanTransactionData',
    //     body.type,
    //     simTx.transactionData.build().toXDR('base64')
    // )

    // const source = await server.getAccount(pubkey)
    // const readyTx = new TransactionBuilder(source, {
    //     fee: (Number(preTx.fee) + Number(simTx.minResourceFee)).toString(),
    //     networkPassphrase,
    // })
    // // @ts-ignore
    // .addOperation(Operation.invokeHostFunction(tx.operations[0]))
    // .setSorobanData(simTx.transactionData.build())
    // .setTimeout(TimeoutInfinite)
    // .build()

    // const readyTx_1 = await server.prepareTransaction(preTx)

    // readyTx_1.sign(kp)

    // console.log('readyTx_1', body.type, readyTx_1.toXDR());

    // const readyTx_2 = await server.prepareTransaction(readyTx_1)

    // console.log('readyTx_2', body.type, readyTx_2.toXDR());

    // readyTx_2.sign(kp)
    ///

    const readyTx = await server.prepareTransaction(preTx)

    readyTx.sign(kp)

    await new Promise((resolve) => setTimeout(resolve, 1000)) // Throttle TX_QUEUE to 1 tx per second
    const subTx = await server.sendTransaction(readyTx)

    switch (subTx.status) {
        case 'PENDING':
            console.log(subTx)
            const hash = env.MINT_FACTORY.idFromString(body.id)
            const stub = env.MINT_FACTORY.get(hash)
            return stub.fetch(`http://fake-host/sent/${subTx.hash}`, { 
                method: 'PATCH',
                body: JSON.stringify(body) // send along the `body` in case we need to re-queue later
            })
        default: // DUPLICATE | TRY_AGAIN_LATER | ERROR
            // TODO there's more work that needs to go into queuing up transactions that have error'ed for recoverable things like sequence number or insufficient fee vs things like the account missing or other unrecoverable issues
            // TODO return the channel account
            console.log(subTx)
            await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds before retrying
            throw new StatusError(400, subTx.status)
    }

    // TODO we should likely add a try {} catch {} finally {} here so we can return the channel in case of funky error
    // REALLY gotta watch that we don't jail channel accounts
}