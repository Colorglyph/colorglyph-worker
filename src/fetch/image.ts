import { IRequestStrict, status } from "itty-router"

export async function image(req: IRequestStrict, env: Env, ctx: ExecutionContext): Promise<Response> {
    const object = await env.IMAGES.get(req.params.hash)
    
    if (!object)
        return status(404)

    return new Response(object.body, {
        headers: {
            'Content-Type': 'image/png',
            'Content-Length': object.size.toString(),
        }
    })
}