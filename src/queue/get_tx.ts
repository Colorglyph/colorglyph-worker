import { server, sleep } from "./common"

export async function getTx(message: Message<MintJob>, env: Env, ctx: ExecutionContext) {
    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
    const stub = env.CHANNEL_ACCOUNT.get(id)

    const body = message.body
    const hash = body.hash!

    let res = await server.getTransaction(hash)

    switch (res.status) {
        case 'SUCCESS':
            console.log(res.status, hash)

            // return the channel
            await stub.fetch(`http://fake-host/return/${body.channel}`, { method: 'PUT' })

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

            break;
        case 'NOT_FOUND':
            console.log(res.status, hash)
            await sleep(5) // wait 5 seconds and retry
            message.retry()
            break;
        case 'FAILED':
            // return the channel
            await stub.fetch(`http://fake-host/return/${body.channel}`, { method: 'PUT' })

            // TEMP while we wait for `soroban-client` -> `server.getTransaction` -> `FAILED` to send more complete data
            const res_string = await server._getTransaction(hash)
                .then((res) => JSON.stringify(res, null, 2))

            console.log(hash, res_string)

            // save the error
            const existing = await env.ERRORS.get(body.id)

            const encoder = new TextEncoder()
            const data = encoder.encode(`${await existing?.text()}\n\n${hash}\n\n${res_string}`)

            await env.ERRORS.put(body.id, data)

            // TODO there can be failures do to the resourcing in which case we should toss this hash but re-queue the tx
            // we should be somewhat careful here though as this type of failure likely means funds were spent
            // await this.env.TX_SEND.send(body) // TEMP. Bad idea!!

            break;
    }
}