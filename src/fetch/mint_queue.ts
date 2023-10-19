import { IRequestStrict } from "itty-router"

export async function mintQueue(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    let id: DurableObjectId

    const hash = req.params.hash

    if (hash) {
        id = env.MINT_FACTORY.idFromString(hash)
    } else {
        id = env.MINT_FACTORY.newUniqueId()
    }

    return env.MINT_FACTORY.get(id).fetch('http://fake-host', req as any)
}