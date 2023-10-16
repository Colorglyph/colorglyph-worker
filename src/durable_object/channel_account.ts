import {
    error,
    IRequestStrict,
    json,
    Router,
    RouterType,
    status,
    StatusError,
    text,
} from 'itty-router'

// TODO eventually make this dynamic and automated to grow and shrink dynamically
    // otherwise we absolutely will encounter channel account famines

const allChannels = [
    "SBCZK5F4KSKYNEYDMFBKNXGIRM3KEDMLVIGISQLW7WMUBIZFBGQIKZLW",
    "SCU5ARIPFQXMVZIYDQ6KMGLCB6GUZNTE6WDJT5OBOT63GOACR3ODZCDW",
    "SAWWHHD6LS2UJTLBLDEHMADJUELEOEWEYASLNW7A7TVIOZLA2S47XNAU",
    "SB6EOKRVMHNSVQ5JW7O3A5UANAT4N2H6XWSHLT27WS6PBUKWIZG2PWUK",
    "SCOM2GJBEE46VTP7Y5POEVWEVLSOUQOW3UUIQKJAJABKQNWKHUIA3CJK",
    "SBNF66RJJDML3FKFSISK2AJTMKYBC45LUDVIYAIJDUG5TNJVDGSDYUIH",
    "SBACYRNRH436UYQ7ATHSFGNDD5DBN3C42LSQLUF7QTUG5DCSR42XLE7Q",
    "SBUNUNXYXH4PPDA2RM673JPASWT4FX22BWBJ573SYT2UQN7SETJFGQ4Z",
    "SCVCEGR25X27XKP7JKFDFNKX3FUZP6VWOECWXF52C7T3FFID7PXD3FOQ",
    "SCLRI4HPEB3HECAI5CNPEN4SKIRJLDBZRRNQOSXB7TVEPL5HNIK53VYC",
    "SAATA4U7KBU2LGHAFQWVTTEZZANIFAS2N6EEADWD4NLQ4BBY27K5H3RG",
    "SC4ICTOLWENAVR33TYFWLQ3J6RGVEUAUARFWACGLOQCTSZM5V5A3VSQ6",
    "SCRLLZZGQF6CYYAHJP22IGKTJRLS74BAMJDNF3CDIEVQZSF2LZHE5FLV",
    "SBVWS5UL5WCKTAHYD7XNZT4PIZIKP2Y3EZM2PY4MDRSBSHER4U26OSWD",
    "SBBMHV6LZHTTHODJN2KAU4VM274Q6ZAZWK7DNWJEOW6WWM2Y2KATGB7I",
    "SC7ED3S5HNEU554LACR66MQZVCIXWM76JFE6YG44YDRYITKI5RTCQHE2",
    "SDNKBIBEFW6CKZGS7X6EWW6CWD36FPQSVTFADDAVCA6LLL6T6OUSAWSQ",
    "SA2HIQASY4ATYA5U2CRDZDP4YAEORDP7V5L7HCIGYUWEN6F2PG7FP7J4",
    "SDX7OM5AQTIBULRPK5YIUCJGUUCC4KYFYI6IAM6IC77VRZNDUZEFML7W",
    "SCQBLLFLAVBA2QCMV6ZCNODIYJW6DE7XDXMLWVDEOOUGV5PQ6S6IUYWF"
]

export class ChannelAccount {
    env: Env
    storage: DurableObjectStorage
    id: DurableObjectId
    router: RouterType
    availableChannels: string[] = []
    busyChannels: string[] = []

    constructor(state: DurableObjectState, env: Env) {
        this.id = state.id
        this.storage = state.storage
        this.env = env
        this.router = Router()

        this.router
            .get('/take', this.takeChannel.bind(this))
            .get('/return/:secret', this.returnChannel.bind(this))
            .all('*', () => error(404))

        state.blockConcurrencyWhile(async () => {
            this.availableChannels = await this.storage.get('available') || [...allChannels] // make sure to clone the channelList as we check against it later
            this.busyChannels = await this.storage.get('busy') || []
        })
    }

    fetch(req: Request, ...extra: any[]) {
        return this.router
            .handle(req, ...extra)
            .then(json)
            .catch((err) => {
                console.error(err)
                return error(err)
            })
    }

    async takeChannel(req: IRequestStrict) {
        if (this.availableChannels.length === 0)
            throw new StatusError(400, 'No channels available')

        const [ secret ] = this.availableChannels.splice(0, 1)
        this.busyChannels = [...this.busyChannels, secret]

        await this.storage.put('available', this.availableChannels)
        await this.storage.put('busy', this.busyChannels)

        // TODO likely need to combine state storage with object storage so we don't hit race conditions between getting and setting busy channels or give to inbound requests the same available channel
            // Last research I did seemed to indicate this was no longer a risk https://developers.cloudflare.com/durable-objects/examples/build-a-counter/

        return text(secret)
    }

    async returnChannel(req: IRequestStrict) {
        const secret = req.params.secret

        if (!allChannels.includes(secret))
            throw new StatusError(400, 'Invalid channel')

        const index = this.busyChannels.findIndex((channel) => channel === secret)

        if (index === -1)
            throw new StatusError(400, 'Channel not found')

        this.busyChannels.splice(index, 1)
        this.availableChannels = [...this.availableChannels, secret]

        await this.storage.put('available', this.availableChannels)
        await this.storage.put('busy', this.busyChannels)

        return status(204)
    }
}