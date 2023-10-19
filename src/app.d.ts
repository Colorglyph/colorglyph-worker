interface Env {
    CHANNEL_PROCESS: Queue<ChannelJob>
    TX_SEND: Queue<MintJob>
    TX_GET: Queue<MintJob>
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

interface ChannelJob {
    type: 'create' | 'merge',
    channel: string
}