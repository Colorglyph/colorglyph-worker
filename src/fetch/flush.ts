import { IRequestStrict } from "itty-router"

export async function flush(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const id = env.MINT_FACTORY.idFromString(req.params.id)

    return env.MINT_FACTORY
        .get(id)
        .fetch('http://fake-host', req as any)
}