import { IRequestStrict, json } from "itty-router"

export async function glyphs(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    let { results } = await env.DB.prepare(`
        SELECT Hash
        FROM Glyphs 
        WHERE NOT (Id IS NULL AND (Length IS NULL OR Length = 0))
    `).all()
    return json(results)
}