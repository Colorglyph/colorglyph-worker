import { IRequestStrict, json } from "itty-router"

export async function glyphs(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    let { results } = await env.DB.prepare("SELECT * FROM Glyphs").all()
    return json(results)
}