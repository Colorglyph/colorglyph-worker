import { xdr, Keypair, Operation, TransactionBuilder, SorobanRpc, Soroban, Transaction, Networks } from 'stellar-sdk'
import { server, networkPassphrase, sleep, Wallet } from './common'
import { getRandomNumber, sortMapKeys } from '../utils'
import { mineOp } from './mine_op'
import { mintOp } from './mint_op'
import { StatusError } from 'itty-router'
import { writeErrorToR2 } from '../utils/writeErrorToR2'
import { Contract } from './common'
import { AssembledTransaction } from 'colorglyph-sdk'

export async function sendTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext) {
    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1') // Hard coded because we need to resolve to the same DO app wide
    const stub = env.CHANNEL_ACCOUNT.get(id)

    let channel!: string

    try {
        const body = message.body

        // NOTE everywhere we're using stub.fetch we don't have the nice error handling that fetcher gives us so we need to roll our own error handling. 
        // Keep in mind though there may be instances where failure shouldn't kill the whole task. Think returning a channel that's not currently busy for whatever reason
        await stub
            .fetch('http://fake-host/take')
            .then(async (res) => {
                if (res.ok)
                    channel = await res.text()
                else
                    throw await res.json()
            })

        const channel_keypair = Keypair.fromSecret(channel)
        const { contract: Colorglyph } = new Contract(channel_keypair)
        const keypair = Keypair.fromSecret(body.secret)
        const pubkey = keypair.publicKey()

        let preTx: AssembledTransaction<any>

        // let operation: xdr.Operation<Operation.InvokeHostFunction>
        const fee = getRandomNumber(5_000_000, 10_000_000) // TODO we should be smarter about this (using random so at least we have some variance)

        switch (body.type) {
            case 'mine':
                const mineMap = new Map((body.palette as [number, number][]).map(([color, amount]) => [color, amount]))

                preTx = await Colorglyph.colorsMine({
                    source: pubkey,
                    miner: undefined,
                    to: undefined,
                    colors: new Map(sortMapKeys(mineMap))
                }, { fee })
                break;
            case 'mint':
                // TODO requires the colors being used to mint have been mined by the secret (pubkey hardcoded)
                const mintMap = body.palette.length
                    ? new Map([[pubkey, sortMapKeys(new Map(body.palette as [number, number[]][]))]])
                    : new Map()

                preTx = await Colorglyph.glyphMint({
                    minter: pubkey,
                    to: undefined,
                    colors: mintMap,
                    width: body.width,
                }, { fee })
                break;
            default:
                throw new StatusError(404, `Type ${body.type} not found`)
        }

        // const source = await server.getAccount(pubkey)
        // const preTx = new TransactionBuilder(source, {
        //     fee: (getRandomNumber(1_000_000, 10_000_000)).toString(), // TODO we should be smarter about this (using random so at least we have some variance)
        //     networkPassphrase,
        // })
        //     .addOperation(operation)
        //     .setTimeout(30) // 30 seconds. Just needs to be less than the NOT_FOUND retry limit so we never double send
        //     .build()

        // TEMP we likely don't need to simulate again but currently there are cases with multiauth where the initial simulation doesn't account for the authorized operation 
        // https://github.com/stellar/rs-soroban-env/issues/1125
        // this leads to insufficient resource allocation

        // TEMP we're also simulating vs preparing due to lack of error handling in the prepareTransaction method
        // https://stellarfoundation.slack.com/archives/D01LJLND8S1/p1697820475369859 
        // const simTx = await server.simulateTransaction(preTx)

        // if (!SorobanRpc.Api.isSimulationSuccess(simTx)) { // Error, Raw, Restore
        //     await writeErrorToR2(body, simTx, env)
        //     throw new StatusError(400, 'Simulation failed')
        // }

        // const readyTx = SorobanRpc.assembleTransaction(preTx, simTx).build()

        const currentLedger = await server.getLatestLedger()
        const validUntilLedger = currentLedger.sequence + 12 // 1 minute of ledgers

        await preTx.signAuthEntries(new Wallet(keypair), validUntilLedger)

        const ewTx = new Transaction(preTx.raw.toXDR(), Networks.FUTURENET)
        const simTx = await server.simulateTransaction(ewTx)

        if (!SorobanRpc.Api.isSimulationSuccess(simTx)) { // Error, Raw, Restore
            await writeErrorToR2(body, simTx, env)
            throw new StatusError(400, 'Simulation failed')
        }

        const readyTx = SorobanRpc.assembleTransaction(ewTx, simTx).build()

        readyTx.sign(channel_keypair)

        const subTx = await server.sendTransaction(readyTx)

        switch (subTx.status) {
            case 'PENDING':
                console.log(subTx)

                message.ack()

                await sleep(1) // TEMP during Phase 1. Throttle TX_SEND to 1 successfully sent tx per second
                await env.TX_GET.send({
                    ...body, // send along the `body` in case we need to re-queue later
                    hash: subTx.hash,
                    channel // send along the channel secret so we can return it to the pool later
                })

                break;
            default:
                console.log(JSON.stringify(subTx, null, 2))

                switch (subTx.status) {
                    case 'DUPLICATE':
                        message.ack()
                        // TODO I think we lose the channel account in this case
                        break;
                    case 'ERROR':
                    case 'TRY_AGAIN_LATER':
                        message.retry()
                        // TODO I think we lose the channel account in this case
                        break;
                    default:
                        throw new StatusError(404, `Status ${subTx.status} not found`)
                }

                // save the error
                await writeErrorToR2(body, subTx.hash, env)

                // ensure the channel account is returned to the pool
                // NOTE not sure this is wise or not. I do know without it we'll lose the channel account
                throw new StatusError(400, 'Transaction failed')
        }
    } catch (err) {
        console.error(err)

        // TODO save the error?
        // maybe in Sentry as this won't be Stellar/Soroban specific

        // return the channel account
        if (channel)
            await stub
                .fetch(`http://fake-host/return/${channel}`, { method: 'PUT' })
                .then((res) => {
                    if (res.ok) return
                    else throw new StatusError(res.status, res.statusText)
                })

        // Wait 5 seconds before retrying
        // NOTE if we increase the messages per batch we'll need to move this sleep outside this fn so we don't compound sleeps
        await sleep(5)
        message.retry()
    }
}