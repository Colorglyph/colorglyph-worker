import { IRequestStrict, status } from "itty-router"

export async function image(req: IRequestStrict, env: Env, ctx: ExecutionContext): Promise<Response> {
    const object = await env.IMAGES.get(req.params.hash)
    
    if (!object)
        return status(404)

    const cache = caches.default
    const match = await cache.match(req)

    if (match)
        return match

    const res = new Response(object.body, {
        headers: {
            'Cache-Control': 'public, max-age=2419000, immutable',
            'Content-Type': 'image/png',
            'Content-Length': object.size.toString(),
        }
    })

    ctx.waitUntil(cache.put(req.clone(), res.clone()))

    return res
}