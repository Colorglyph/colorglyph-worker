import { StatusError } from "itty-router"
import { writeErrorToR2 } from "../utils/writeErrorToR2"
import { Config, sleep } from "./common"
import { MintFactory } from "../durable_object/mint_factory"

export async function getTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext) {
    const { rpc } = new Config(env)
    const body = message.body
    const hash = body.hash!
    const res = await rpc.getTransaction(hash)

    switch (res.status) {
        case 'SUCCESS':
            try {
                console.log(res.status, hash)

                // update job progress
                const id = env.MINT_FACTORY.idFromString(body.id)
                const stub = env.MINT_FACTORY.get(id) as DurableObjectStub<MintFactory>

                await stub.markProgress({
                    mintJob: body,
                    feeCharged: res.resultXdr.feeCharged().toString(),
                })

                // if the batch fails further down we don't want to retry this message
                message.ack()
            } catch {
                message.retry()
            }
            break;
        case 'NOT_FOUND':
            console.log(res.status, hash)
            
            if (env.ENV === 'development')
                await sleep(5)
            
            message.retry({ delaySeconds: 5 })
            break;
        case 'FAILED':
            try {
                // save the error
                await writeErrorToR2(body, hash, env)

                // TODO there can be failures due to the resourcing in which case we should toss this hash but re-queue the tx
                // we should be somewhat careful here though as this type of failure likely means funds were spent
                // await env.TX_SEND.send(body) // !! bad idea !!

                // this was a failure but not one we want to retry on unless an `await` failed
                message.ack()
            } catch {
                message.retry() // safe because the tx will continue to return FAILED, this isn't a tx retry, just an away retry to ensure the channel is returned and the error is logged
            }
            break;
        default:
            throw new StatusError(404, `Status ${res.status} not found`)
    }
}