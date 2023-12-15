import { SorobanRpc } from "stellar-sdk"
import { server } from "./common"
import { StatusError } from "itty-router"
import { writeErrorToR2 } from "../utils/writeErrorToR2"

export async function getTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext): Promise<boolean> {
    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
    const stub = env.CHANNEL_ACCOUNT.get(id)
    const body = message.body
    const hash = body.hash!

    let res: SorobanRpc.Api.GetTransactionResponse

    try {
        res = await server.getTransaction(hash)
    } catch {
        message.retry()
        return true
    }

    switch (res.status) {
        case 'SUCCESS':
            try {
                console.log(res.status, hash)

                // return the channel
                await stub
                    .fetch(`http://fake-host/return/${body.channel}`, { method: 'PUT' })
                    .then((res) => {
                        if (res.ok) return
                        else throw new StatusError(res.status, res.statusText)
                    })

                // update job progress
                const id = env.MINT_FACTORY.idFromString(body.id)

                await env.MINT_FACTORY
                    .get(id)
                    .fetch(`http://fake-host`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            mintJob: body,
                            returnValueXDR: res.returnValue?.toXDR('base64')
                        })
                    })
                    .then((res) => {
                        if (res.ok) return
                        else throw new StatusError(res.status, res.statusText)
                    })

                // if the batch fails further down we don't want to retry this message
                message.ack()
                return false
            } catch {
                message.retry()
                return true
            }
        case 'NOT_FOUND':
            console.log(res.status, hash)
            message.retry()
            return true
        case 'FAILED':
            try {
                // return the channel
                await stub
                    .fetch(`http://fake-host/return/${body.channel}`, { method: 'PUT' })
                    .then((res) => {
                        if (res.ok) return
                        else throw new StatusError(res.status, res.statusText)
                    })

                // save the error
                await writeErrorToR2(body, hash, env)

                // TODO there can be failures do to the resourcing in which case we should toss this hash but re-queue the tx
                // we should be somewhat careful here though as this type of failure likely means funds were spent
                // await env.TX_SEND.send(body) // !! bad idea !!

                // this was a failure but not one we want to retry on unless an `await` failed
                message.ack()
                return false
            } catch {
                message.retry() // safe because the tx will continue to return FAILED, this isn't a tx retry, just an away retry to ensure the channel is returned and the error is logged
                return true
            }
        default:
            throw new StatusError(404, `Status ${res.status} not found`)
    }
}