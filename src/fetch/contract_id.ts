import { IRequestStrict } from "itty-router";
import { config } from "../utils/passkey";

export async function contractId(req: IRequestStrict, env: Env, ctx: ExecutionContext) {
    const { account } = config(env)

    await account.setMercuryJwt()

    const contractId = await account.getContractId(req.params.signer)

    if (!contractId)
        return Response.json({ message: 'Contract not found' }, { status: 404 })

    return new Response(contractId)
}