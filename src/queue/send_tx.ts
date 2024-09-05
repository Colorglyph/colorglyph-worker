import { Account, Keypair, Operation, SorobanRpc, Transaction, TransactionBuilder, authorizeEntry, nativeToScVal, xdr } from '@stellar/stellar-sdk'
import { sleep, Config } from './common'
import { sortMapKeys } from '../utils'
import { StatusError } from 'itty-router'
import { writeErrorToR2 } from '../utils/writeErrorToR2'

export async function sendTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext) {
    const config = new Config(env)
    const { rpc, networkPassphrase, contractId } = config

    try {
        const body = message.body
        const keypair = Keypair.fromSecret(body.secret)
        const pubkey = keypair.publicKey()
        const source = await rpc.getAccount(pubkey).then(res => new Account(res.accountId(), res.sequenceNumber()))

        let preTx: Transaction

        switch (body.type) {
            case 'mine':
                let mineMap = new Map((body.palette as [number, number][]).map(([color, amount]) => [color, amount]))
                mineMap = new Map(sortMapKeys(mineMap));

                const mineMapScVals = [...mineMap.entries()].map(([color, amount]) =>
                    new xdr.ScMapEntry({
                        key: nativeToScVal(color, { type: 'u32' }),
                        val: nativeToScVal(amount, { type: 'u32' })
                    })
                )

                preTx = new TransactionBuilder(source, {
                    fee: '0',
                    networkPassphrase: networkPassphrase,
                })
                    .addOperation(Operation.invokeContractFunction({
                        contract: contractId,
                        function: 'colors_mine',
                        args: [
                            nativeToScVal(pubkey, { type: 'address' }), // source
                            xdr.ScVal.scvMap(mineMapScVals), // colors
                            nativeToScVal(undefined), // miner
                            nativeToScVal(undefined), // to
                        ]
                    }))
                    .setTimeout(0)
                    .build()

                break;
            case 'mint':
                // TODO requires the colors being used to mint have been mined by the secret (pubkey hardcoded)
                let mintMap = body.palette.length
                    ? new Map([[pubkey, sortMapKeys(new Map(body.palette as [number, number[]][]))]])
                    : new Map()
                mintMap = new Map(sortMapKeys(mintMap));

                const mintMapScVals = [...mintMap.entries()].map(([pubkey, colors]) =>
                    new xdr.ScMapEntry({
                        key: nativeToScVal(pubkey, { type: 'address' }),
                        val: xdr.ScVal.scvMap([...colors.entries()].map(([color, amounts]: any) =>
                            new xdr.ScMapEntry({
                                key: nativeToScVal(color, { type: 'u32' }),
                                val: xdr.ScVal.scvVec(amounts.map((amount: number) => nativeToScVal(amount, {type: 'u32'})))
                            })
                        ))
                    })
                )

                preTx = new TransactionBuilder(source, {
                    fee: '0',
                    networkPassphrase: networkPassphrase,
                })
                    .addOperation(Operation.invokeContractFunction({
                        contract: contractId,
                        function: 'glyph_mint',
                        args: [
                            nativeToScVal(Buffer.from(body.hash!, 'hex')), // hash
                            nativeToScVal(pubkey, { type: 'address' }), // minter
                            nativeToScVal(undefined), // to
                            xdr.ScVal.scvMap(mintMapScVals), // colors
                            body.width ? nativeToScVal(body.width, { type: 'u32' }) : nativeToScVal(undefined), // width
                        ]
                    }))
                    .setTimeout(0)
                    .build()
                break;
            default:
                throw new StatusError(404, `Type ${body.type} not found`)
        }

        const preSim = await rpc.simulateTransaction(preTx)

        if (!SorobanRpc.Api.isSimulationSuccess(preSim)) // Error, Raw, Restore
            throw new StatusError(400, `Transaction pre simulation failed: "${preSim.error}"`)

        const authTx = SorobanRpc.assembleTransaction(preTx, preSim).build()

        const { sequence } = await rpc.getLatestLedger()

        for (const op of authTx.operations) {
            const auths = (op as Operation.InvokeHostFunction).auth

            if (!auths?.length)
                continue;

            for (let i = 0; i < auths.length; i++) {
                auths[i] = await authorizeEntry(
                    auths[i],
                    keypair,
                    sequence + 12,
                    networkPassphrase
                )
            }
        }

        const authSim = await rpc.simulateTransaction(authTx)

        if (!SorobanRpc.Api.isSimulationSuccess(authSim)) // Error, Raw, Restore
            throw new StatusError(400, `Transaction auth simulation failed: "${authSim.error}"`)

        // const tempTx = new Transaction(preTx.built!.toXDR(), networkPassphrase)
        const sendTx = SorobanRpc.assembleTransaction(authTx, authSim).build()

        sendTx.sign(keypair)

        // console.log(readyTx.toXDR());

        const sentTx = await rpc.sendTransaction(sendTx)

        switch (sentTx.status) {
            case 'PENDING':
                console.log(sentTx)

                message.ack()

                await env.TX_GET.send({
                    ...body, // send along the `body` in case we need to re-queue later
                    hash: sentTx.hash,
                })

                break;
            default:
                console.log(`
                    ${body.id}
                    ${pubkey}
                    ${JSON.stringify(sentTx, null, 2)}
                `)

                switch (sentTx.status) {
                    case 'DUPLICATE':
                        message.ack()
                        break;
                    case 'ERROR':
                    case 'TRY_AGAIN_LATER':
                        message.retry()
                        break;
                    default:
                        throw new StatusError(404, `Status ${sentTx.status} not found`)
                }

                // save the error
                await writeErrorToR2(body, authSim, env, JSON.stringify(sentTx, null, 2))

                // ensure the channel account is returned to the pool
                // NOTE not sure this is wise or not. I do know without it we'll lose the channel account
                throw new StatusError(400, `Transaction ${sentTx.status} error`)
        }
    } catch (err) {
        console.error(err);

        // TODO save the error?
        // maybe in Sentry as this won't be Stellar/Soroban specific

        // Wait 5 seconds before retrying
        if (env.ENV === 'development')
            await sleep(5)

        message.retry({ delaySeconds: 5 })
    }
}