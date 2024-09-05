import { IRequestStrict, status } from "itty-router"
import { MintFactory } from "../durable_object/mint_factory"

export async function flush(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const id = env.MINT_FACTORY.idFromString(req.params.id)
    const stub = env.MINT_FACTORY.get(id) as DurableObjectStub<MintFactory>

    await stub.flushAll()

    return status(204)
}