import { IRequestStrict } from "itty-router"

export async function debug(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const id = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
    return env.CHANNEL_ACCOUNT.get(id).fetch(req)
}