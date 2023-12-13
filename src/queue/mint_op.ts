import { Keypair } from 'stellar-sdk'
import { Contract, RawContract } from './common'
import { sortMapKeys } from '../utils'
import { authorizeOperation } from './authorize_op'

export async function mintOp(body: MintJob, env: Env) {
    const keypair = Keypair.fromSecret(body.secret)
    const pubkey = keypair.publicKey()
    const { contract: Colorglyph } = new Contract(keypair)

    // TODO requires the colors being used to mint have been mined by the secret (pubkey hardcoded)
    const mintMap = body.palette.length
        ? new Map([[pubkey, sortMapKeys(new Map(body.palette as [number, number[]][]))]])
        : new Map()

    const args = Colorglyph.spec.funcArgsToScVals('glyph_mint', {
        minter: pubkey,
        to: undefined,
        colors: mintMap,
        width: body.width,
    })

    const operation = RawContract.call(
        'glyph_mint',
        ...args
    )

    return authorizeOperation(body, operation, keypair, env)
}