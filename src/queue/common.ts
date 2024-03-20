import { Contract as ColorglyphContract } from 'colorglyph-sdk'
import { Keypair, Networks, Transaction, SorobanRpc, hash, Horizon } from '@stellar/stellar-sdk'
import fetchAdapter from '@vespaiach/axios-fetch-adapter'
import { Buffer } from 'buffer'

SorobanRpc.AxiosClient.defaults.adapter = fetchAdapter as any
Horizon.AxiosClient.defaults.adapter = fetchAdapter as any

export function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

export class Config {
    contractId: string
    oceanKp: Keypair
    rpcUrl: string
    networkPassphrase: Networks
    horizon: Horizon.Server
    rpc: SorobanRpc.Server

    constructor(env: Env) {
        const isLocal = env.NETWORK === 'local'
        const isFuture = env.NETWORK === 'future'
        const isTest = env.NETWORK === 'test'

        this.contractId = env.CONTRACT_ID
        this.oceanKp = Keypair.fromSecret(env.OCEAN_SK)

        this.rpcUrl = isLocal ? 'http://localhost:8000/soroban/rpc' 
        : isFuture ? 'https://rpc-futurenet.stellar.org' 
        : isTest ? 'https://soroban-testnet.stellar.org' 
        : 'http://67.205.175.159:8000/soroban/rpc'

        this.networkPassphrase = isLocal ? Networks.STANDALONE 
        : isFuture ? Networks.FUTURENET
        : isTest ? Networks.TESTNET
        : Networks.PUBLIC

        this.horizon = new Horizon.Server(isLocal ? 'http://localhost:8000' 
        : isFuture ? 'https://horizon-futurenet.stellar.org'
        : isTest ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
        , { allowHttp: isLocal })
        this.rpc = new SorobanRpc.Server(this.rpcUrl, { allowHttp: isLocal })
    }
}

export class Wallet {
    keypair: Keypair
    config: Config

    constructor(keypair: Keypair, config: Config) {
        this.keypair = keypair
        this.config = config
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
        const transaction = new Transaction(xdr, this.config.networkPassphrase)

        transaction.sign(this.keypair)

        return transaction.toXDR()
    }
    async signAuthEntry(entryXdr: string) {
        return this.keypair
            .sign(hash(Buffer.from(entryXdr, 'base64')))
            .toString('base64')
    }
}

export class Contract {
    contract: ColorglyphContract

    constructor(keypair: Keypair, config: Config) {
        this.contract = new ColorglyphContract({
            contractId: config.contractId,
            rpcUrl: config.rpcUrl,
            networkPassphrase: config.networkPassphrase,
            wallet: new Wallet(keypair, config)
        })
    }
}