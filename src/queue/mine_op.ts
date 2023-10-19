import { Keypair } from 'soroban-client'
import { Contract, RawContract } from './common'
import { sortMapKeys } from '../utils'
import { authorizeOperation } from './authorize_op'

// TODO both this and processMint could likely be further dry'ed up

export async function mineOp(message: Message<MintJob>, env: Env) {
    const body = message.body
    const kp = Keypair.fromSecret(body.secret)
    const pubkey = kp.publicKey()
    const { contract: Colorglyph } = new Contract(kp)

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

    return authorizeOperation(body, operation, kp, env)
}