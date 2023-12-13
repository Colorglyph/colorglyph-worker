import { Keypair } from 'stellar-sdk'
import { Contract, RawContract } from './common'
import { sortMapKeys } from '../utils'
import { authorizeOperation } from './authorize_op'

export async function mineOp(body: MintJob, env: Env) {
    const keypair = Keypair.fromSecret(body.secret)
    const pubkey = keypair.publicKey()
    const { contract: Colorglyph } = new Contract(keypair)

    const mineMap = new Map((body.palette as [number, number][]).map(([color, amount]) => [color, amount]))

    const args = Colorglyph.spec.funcArgsToScVals('colors_mine', {
        source: pubkey,
        miner: undefined,
        to: undefined,
        colors: new Map(sortMapKeys(mineMap))
    })

    const operation = RawContract.call(
        'colors_mine',
        ...args
    )

    return authorizeOperation(body, operation, keypair, env)
}