import { Contract as ColorglyphContract, networks } from 'colorglyph-sdk'
import { fetcher } from 'itty-fetcher'
import { Keypair, Networks, Transaction, SorobanRpc, Contract as SorobanClientContract, hash,  } from 'stellar-sdk'
import { Buffer } from 'buffer'

export const rpcUrl = 'https://rpc-futurenet.stellar.org'
export const networkPassphrase = Networks.FUTURENET

export const oceanKp = Keypair.fromSecret('SAJR6ISVN7C5AP6ICU7NWP2RZUSSCIG3FMPD66WJWUA23REZGH66C4TE') // GDKZ4O7446TNQTR3NZVJTAS7FTF6B6P2VF3B5NT2SMB2BPAF5OMIJO4S
export const XLM = 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT'

export const horizon = fetcher({ base: 'https://horizon-futurenet.stellar.org' })
export const server = new SorobanRpc.Server(rpcUrl)

export const RawContract = new SorobanClientContract(networks.futurenet.contractId)

export function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

export class Wallet {
    keypair: Keypair

    constructor(keypair: Keypair) {
        this.keypair = keypair
    }
    async isConnected() {
        return true
    }
    async isAllowed() {
        return true
    }
    async getUserInfo() {
        return {
            publicKey: this.keypair.publicKey()
        }
    }
    async signTransaction(xdr: string) {
        const transaction = new Transaction(xdr, networkPassphrase)

        transaction.sign(this.keypair)

        return transaction.toXDR()
    }
    async signAuthEntry(entryXdr: string) {
        return this.keypair
            .sign(hash(Buffer.from(entryXdr, "base64")))
            .toString('base64')
    }
}

export class Contract {
    contract: ColorglyphContract

    constructor(keypair: Keypair) {
        this.contract = new ColorglyphContract({
            ...networks.futurenet,
            rpcUrl,
            wallet: new Wallet(keypair)
        })
    }
}