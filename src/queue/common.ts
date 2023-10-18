import { Contract as ColorglyphContract } from 'colorglyph-sdk'
import { Keypair, Networks, Transaction, Server, Contract as SorobanClientContract } from 'soroban-client'

export const rpcUrl = 'https://rpc-futurenet.stellar.org'
export const networkPassphrase = Networks.FUTURENET

export const contractId = 'CBWYBBBXPDYXDH2HMRAYNSDBVMLGS4C7PFGGIZU6PK4HCJUPE7UKILHY'
export const XLM = 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT'

export const server = new Server(rpcUrl)

export const RawContract = new SorobanClientContract(contractId)

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
            contractId,
            networkPassphrase,
            rpcUrl,
            wallet: new Wallet(kp)
        })
    }
}