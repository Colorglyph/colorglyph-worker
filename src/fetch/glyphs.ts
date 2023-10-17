import { IRequestStrict, json } from "itty-router"

export async function glyphs(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const { keys } = await env.GLYPHS.list()

    return json(keys)
}