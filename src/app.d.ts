interface Env {
    TX_QUEUE: Queue
	MINT_QUEUE: Queue
	MINT_FACTORY: DurableObjectNamespace
    CHANNEL_ACCOUNT: DurableObjectNamespace
}

interface MintRequest {
    secret: string
    palette: number[]
    width: number
}

interface MintJob {
    id: string
    type: 'mine'|'mint'
    secret: string
    channel?: string
    palette: number[]|[number, number[]][]
    width?: number
    tx?: string
}