import { IRequestStrict, json } from "itty-router"
import { MintFactory } from "../durable_object/mint_factory"

export async function mintQueue(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const hash = req.params.hash

    if (hash) {
        const id = env.MINT_FACTORY.idFromString(hash)
        const stub = env.MINT_FACTORY.get(id) as DurableObjectStub<MintFactory>
        return json(await stub.getJob())
    } else {
        const id = env.MINT_FACTORY.newUniqueId()
        const stub = env.MINT_FACTORY.get(id) as DurableObjectStub<MintFactory>
        return json(await stub.mintJob(await req.json()))
    }
}