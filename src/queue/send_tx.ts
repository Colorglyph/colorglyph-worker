import { Keypair, SorobanRpc, Transaction } from 'stellar-sdk'
import { networkPassphrase, server, sleep, Wallet, Contract } from './common'
import { sortMapKeys } from '../utils'
import { StatusError } from 'itty-router'
import { writeErrorToR2 } from '../utils/writeErrorToR2'
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
        const fee = 10_000_000

        let preTx: AssembledTransaction<any>

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

        const currentLedger = await server.getLatestLedger()
        const validUntilLedger = currentLedger.sequence + 12 // 1 minute of ledgers

        if ((await preTx.needsNonInvokerSigningBy()).length)
            await preTx.signAuthEntries(new Wallet(keypair), validUntilLedger)

        const simTx = await server.simulateTransaction(preTx.raw)

        if (!SorobanRpc.Api.isSimulationSuccess(simTx)) { // Error, Raw, Restore
            await writeErrorToR2(body, simTx, env)
            throw new StatusError(400, 'Simulation failed')
        }

        if (body.type === 'mine')
            simTx.transactionData.setResources(
                preTx.simulationData.transactionData.resources().instructions(),
                preTx.simulationData.transactionData.resources().readBytes() + 188, // TODO <-- be smarter about this. We only need it if we simulated a key that didn't exist in a prior submission but will exist in this submission (there's a key overlap where not every color is unique)
                preTx.simulationData.transactionData.resources().writeBytes(),
            )

        // if (body.width)
        //     console.log(
        //         simTx.cost,
        //         preTx.simulationData.transactionData.resourceFee(),
        //         preTx.simulationData.transactionData.resources()
        //     );

        // simTx.transactionData.setResourceFee(Number(preTx.simulationData.transactionData.resourceFee()) + getRandomNumber(100_000, 1_000_000))

        const tempTx = new Transaction(preTx.raw.toXDR(), networkPassphrase)
        const readyTx = SorobanRpc.assembleTransaction(tempTx, simTx).build()

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
                        break;
                    case 'ERROR':
                    case 'TRY_AGAIN_LATER':
                        message.retry()
                        break;
                    default:
                        throw new StatusError(404, `Status ${subTx.status} not found`)
                }

                // save the error
                await writeErrorToR2(body, subTx.hash, env)

                // ensure the channel account is returned to the pool
                // NOTE not sure this is wise or not. I do know without it we'll lose the channel account
                throw new StatusError(400, `Transaction ${subTx.status} error`)
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