interface Env {
    CHANNEL_PROCESS: Queue<ChannelJob>
    TX_SEND: Queue<MintJob>
    TX_GET: Queue<MintJob>
    CHANNEL_ACCOUNT: DurableObjectNamespace
    MINT_FACTORY: DurableObjectNamespace
    IMAGES: R2Bucket
    ERRORS: R2Bucket
    GLYPHS: KVNamespace

    NETWORK: local | future // TODO | test | public
    CONTRACT_ID: string
    OCEAN_SK: string
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
    channel?: string
    width?: number
    hash?: string
}

interface ChannelJob {
    type: 'create' | 'merge',
    channel: string
}