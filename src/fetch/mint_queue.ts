import { IRequestStrict } from "itty-router"

export async function mintQueue(req: IRequestStrict, env: Env, ctx: ExecutionContext): Promise<Response> {
    let id: DurableObjectId
    const hash = req.params.hash

    if (hash) {
        id = env.MINT_FACTORY.idFromString(hash)
    } else {
        id = env.MINT_FACTORY.newUniqueId()
    }

    const stub = env.MINT_FACTORY.get(id)
    // let path = new URL(req.url).pathname.split('/').splice(2).join('/')

    return stub.fetch('http://fake-host', req as any)
}