interface Env {
    TX_SEND: Queue<MintJob>
    TX_GET: Queue<MintJob>
    MINT_FACTORY: DurableObjectNamespace
    IMAGES: R2Bucket
    ERRORS: R2Bucket
    GLYPHS: KVNamespace
    NETWORK: local | future | test // TODO public
    CONTRACT_ID: string
    OCEAN_SK: string
    ENV: development | production
    LAUNCHTUBE_JWT: string
    MERCURY_JWT: string
    DB: D1Database
}

interface MintRequest {
    secret: string
    palette: number[]
    width: number
}

interface MintJob {
    id: string
    type: 'mine' | 'mint'
    secret: string
    palette: [number, number][] | [number, number[]][] // ensure we keep this around in case we end up needing to re-queue at some point
    width?: number
    hash?: string
}