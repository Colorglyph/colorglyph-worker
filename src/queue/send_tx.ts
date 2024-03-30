import { Keypair, SorobanRpc, Transaction } from '@stellar/stellar-sdk'
import { sleep, Config, Wallet, Contract } from './common'
import { sortMapKeys } from '../utils'
import { StatusError } from 'itty-router'
import { writeErrorToR2 } from '../utils/writeErrorToR2'
import { AssembledTransaction } from 'colorglyph-sdk'

export async function sendTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext) {
    const config = new Config(env)
    const { rpc, networkPassphrase } = config

    try {
        const body = message.body

        // NOTE everywhere we're using stub.fetch we don't have the nice error handling that fetcher gives us so we need to roll our own error handling. 
        // Keep in mind though there may be instances where failure shouldn't kill the whole task. Think returning a channel that's not currently busy for whatever reason

        const keypair = Keypair.fromSecret(body.secret)
        const pubkey = keypair.publicKey()
        const { contract: Colorglyph } = new Contract(keypair, config)

        let preTx: AssembledTransaction<any>

        switch (body.type) {
            case 'mine':
                const mineMap = new Map((body.palette as [number, number][]).map(([color, amount]) => [color, amount]))

                preTx = await Colorglyph.colorsMine({
                    source: pubkey,
                    miner: undefined,
                    to: undefined,
                    colors: new Map(sortMapKeys(mineMap))
                })
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
                })
                break;
            default:
                throw new StatusError(404, `Type ${body.type} not found`)
        }

        const currentLedger = await rpc.getLatestLedger()
        const validUntilLedger = currentLedger.sequence + 12 // 1 minute of ledgers

        if ((await preTx.needsNonInvokerSigningBy()).length)
            await preTx.signAuthEntries(new Wallet(keypair, config), validUntilLedger)

        const simTx = await rpc.simulateTransaction(preTx.raw)

        if (!SorobanRpc.Api.isSimulationSuccess(simTx)) // Error, Raw, Restore
            throw new StatusError(400, `Transaction simulation failed: "${simTx.error}"`)

        // TEMP...hopefully
        if (body.type === 'mine') {
            simTx.minResourceFee = (2 ** 32 - 1 - Number(preTx.raw.fee)).toString() // TEMP

            simTx.transactionData.setResources(
                preTx.simulationData.transactionData.resources().instructions(),
                preTx.simulationData.transactionData.resources().readBytes() + 52, // TODO <-- be smarter about this. We only need it if we simulated a key that didn't exist in a prior submission but will exist in this submission (there's a key overlap where not every color is unique)
                preTx.simulationData.transactionData.resources().writeBytes() + 52, // TODO <-- see above (once this is live https://github.com/stellar/rs-soroban-env/pull/1363 we should be golden)
            )
        }
        ////

        if (
            body.type === 'mint'
            || body.width
        )   {
            const txData = simTx.transactionData.build();

            console.log({
                resourceFee: txData.resourceFee().toString(),
                cost: {
                    cpuInsns: simTx.cost.cpuInsns,
                    memBytes: simTx.cost.memBytes,
                },
                resources: {
                    instructions: txData.resources().instructions(),
                    readBytes: txData.resources().readBytes(),
                    writeBytes: txData.resources().writeBytes(),
                },
            });
        }

        const tempTx = new Transaction(preTx.raw.toXDR(), networkPassphrase)
        const readyTx = SorobanRpc.assembleTransaction(tempTx, simTx).build()

        readyTx.sign(keypair)

        // console.log(readyTx.toXDR());

        const subTx = await rpc.sendTransaction(readyTx)

        switch (subTx.status) {
            case 'PENDING':
                console.log(subTx)

                message.ack()

                await env.TX_GET.send({
                    ...body, // send along the `body` in case we need to re-queue later
                    hash: subTx.hash,
                })

                break;
            default:
                console.log(`
                    ${body.id}
                    ${pubkey}
                    ${JSON.stringify(subTx, null, 2)}
                `)

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
                await writeErrorToR2(body, simTx, env, JSON.stringify(subTx, null, 2))

                // ensure the channel account is returned to the pool
                // NOTE not sure this is wise or not. I do know without it we'll lose the channel account
                throw new StatusError(400, `Transaction ${subTx.status} error`)
        }
    } catch (err) {
        console.error(err);

        // TODO save the error?
        // maybe in Sentry as this won't be Stellar/Soroban specific

        // Wait 5 seconds before retrying
        // NOTE if we increase the messages per batch we'll need to move this sleep outside this fn so we don't compound sleeps
        await sleep(5)
        message.retry()
    }
}