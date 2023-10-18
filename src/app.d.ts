interface Env {
    TX_QUEUE: Queue
    MINT_QUEUE: Queue
    MINT_FACTORY: DurableObjectNamespace
    CHANNEL_ACCOUNT: DurableObjectNamespace
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
    tx?: string
}