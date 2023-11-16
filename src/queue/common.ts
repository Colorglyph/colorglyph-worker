import { Contract as ColorglyphContract, networks } from 'colorglyph-sdk'
import { fetcher } from 'itty-fetcher'
import { Keypair, Networks, Transaction, SorobanRpc, Contract as SorobanClientContract,  } from 'stellar-sdk'

export const rpcUrl = 'https://rpc-futurenet.stellar.org'
export const networkPassphrase = Networks.FUTURENET

export const oceanKp = Keypair.fromSecret('SAJR6ISVN7C5AP6ICU7NWP2RZUSSCIG3FMPD66WJWUA23REZGH66C4TE')
export const XLM = 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT'

export const horizon = fetcher({ base: 'https://horizon-futurenet.stellar.org' })
export const server = new SorobanRpc.Server(rpcUrl)

export const RawContract = new SorobanClientContract(networks.futurenet.contractId)

export function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

export class Wallet {
    kp: Keypair

    constructor(kp: Keypair) {
        this.kp = kp
    }
    async isConnected() {
        return true
    }
    async isAllowed() {
        return true
    }
    async getUserInfo() {
        return {
            publicKey: this.kp.publicKey()
        }
    }
    async signTransaction(xdr: string) {
        const transaction = new Transaction(xdr, networkPassphrase)

        transaction.sign(this.kp)

        return transaction.toXDR()
    }
}

export class Contract {
    contract: ColorglyphContract

    constructor(kp: Keypair) {
        this.contract = new ColorglyphContract({
            ...networks.futurenet,
            rpcUrl,
            wallet: new Wallet(kp)
        })
    }
}