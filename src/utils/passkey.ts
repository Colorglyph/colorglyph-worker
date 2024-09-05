import { PasskeyServer } from "passkey-kit";

export function config(env: Env) {
    const isLocal = env.NETWORK === 'local'
    const isFuture = env.NETWORK === 'future'
    const isTest = env.NETWORK === 'test'

    const rpcUrl = isLocal ? 'http://localhost:8000/soroban/rpc'
        : isFuture ? 'https://rpc-futurenet.stellar.org'
            : isTest ? 'https://soroban-testnet.stellar.org'
                : 'http://67.205.175.159:8000/soroban/rpc'

    const launchtubeUrl = "https://launchtube.sdf-ecosystem.workers.dev"
    const mercuryUrl = "https://api.mercurydata.app"

    const account = new PasskeyServer({
        rpcUrl,
        launchtubeUrl,
        launchtubeJwt: env.LAUNCHTUBE_JWT,
        mercuryUrl,
        mercuryJwt: env.MERCURY_JWT,
    });

    return {
        account
    }
}