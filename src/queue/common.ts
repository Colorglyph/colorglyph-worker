import { Contract as ColorglyphContract } from 'colorglyph-sdk'
import { fetcher } from 'itty-fetcher'
import { Keypair, Networks, Transaction, SorobanRpc, Contract as SorobanClientContract, hash,  } from 'stellar-sdk'
import { Buffer } from 'buffer'

export const rpcUrl = 'https://rpc-futurenet.stellar.org' // 'http://localhost:8000/soroban/rpc'
export const networkPassphrase = Networks.FUTURENET

export const oceanKp = Keypair.fromSecret('SAJR6ISVN7C5AP6ICU7NWP2RZUSSCIG3FMPD66WJWUA23REZGH66C4TE') // GDKZ4O7446TNQTR3NZVJTAS7FTF6B6P2VF3B5NT2SMB2BPAF5OMIJO4S
export const XLM = 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT' // 'CDMLFMKMMD7MWZP3FKUBZPVHTUEDLSX4BYGYKH4GCESXYHS3IHQ4EIG4'

export const horizon = fetcher({ base: 'https://horizon-futurenet.stellar.org' }) // fetcher({ base: 'http://localhost:8000' })
export const server = new SorobanRpc.Server(rpcUrl, { allowHttp: true })

export const contractId = 'CDMGYHGOOT6B47C4UG2RY5C2H34FXA4H6B7I43BSCDS3A7I2FUOFQ563' // 'CBPLGS24VMUWVFCQOUABQ3MMLU6JJ5Q2N2QFV2HSFXEWTDVVR64YT26K'
export const RawContract = new SorobanClientContract(contractId)

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
            // ...networks.futurenet,
            networkPassphrase,
            contractId,
            rpcUrl,
            wallet: new Wallet(keypair)
        })
    }
}