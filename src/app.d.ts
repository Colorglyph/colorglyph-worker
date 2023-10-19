interface Env {
    TX_SEND: Queue
    TX_GET: Queue
    CHANNEL_ACCOUNT: DurableObjectNamespace
    MINT_FACTORY: DurableObjectNamespace
    IMAGES: R2Bucket
    ERRORS: R2Bucket
    GLYPHS: KVNamespace
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
    palette: [number, number][] | [number, number[]][]
    channel?: string
    width?: number
    hash?: string
}