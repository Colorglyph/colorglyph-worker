import { IRequestStrict } from "itty-router"

export async function debug(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const hash = env.CHANNEL_ACCOUNT.idFromName('Colorglyph.v1')
    return env.CHANNEL_ACCOUNT.get(hash).fetch(req)
}