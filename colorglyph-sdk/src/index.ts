import { ContractSpec, Address } from '@stellar/stellar-sdk';
import { Buffer } from "buffer";
import { AssembledTransaction, Ok, Err } from './assembled-tx.js';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
  Error_,
  Result,
} from './assembled-tx.js';
import type { ClassOptions, XDR_BASE64 } from './method-options.js';

export * from './assembled-tx.js';
export * from './method-options.js';

if (typeof window !== 'undefined') {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}


export const networks = {
    standalone: {
        networkPassphrase: "Standalone Network ; February 2017",
        contractId: "CBHJTG65F3KBVKOEOZTPUIH47JK54WWTHOKIYRLJ64DVLZCC4ZYU6W5U",
    }
} as const

/**
    
    */
export const Errors = {
1: {message:""},
  2: {message:""},
  3: {message:""},
  4: {message:""},
  5: {message:""},
  6: {message:""},
  7: {message:""},
  8: {message:""}
}
/**
    
    */
export type StorageKey = {tag: "OwnerAddress", values: void} | {tag: "TokenAddress", values: void} | {tag: "FeeAddress", values: void} | {tag: "MaxEntryLifetime", values: void} | {tag: "MaxPaymentCount", values: void} | {tag: "MinterRoyaltyRate", values: void} | {tag: "MinerRoyaltyRate", values: void} | {tag: "Color", values: readonly [string, string, u32]} | {tag: "Colors", values: readonly [string]} | {tag: "Glyph", values: readonly [Buffer]} | {tag: "GlyphOwner", values: readonly [Buffer]} | {tag: "GlyphMinter", values: readonly [Buffer]} | {tag: "GlyphOffer", values: readonly [Buffer]} | {tag: "AssetOffer", values: readonly [Buffer, string, i128]};

/**
    
    */
export type HashType = {tag: "Colors", values: readonly [string]} | {tag: "Glyph", values: readonly [Buffer]};

/**
    
    */
export type GlyphType = {tag: "Colors", values: readonly [Map<string, Map<u32, Array<u32>>>]} | {tag: "Glyph", values: readonly [Glyph]};

/**
    
    */
export interface Glyph {
  /**
    
    */
colors: Map<string, Map<u32, Array<u32>>>;
  /**
    
    */
length: u32;
  /**
    
    */
width: u32;
}

/**
    
    */
export type OfferCreate = {tag: "Glyph", values: readonly [Buffer, Offer]} | {tag: "Asset", values: readonly [Buffer, string, string, i128]};

/**
    
    */
export type Offer = {tag: "Glyph", values: readonly [Buffer]} | {tag: "Asset", values: readonly [string, i128]} | {tag: "AssetSell", values: readonly [string, string, i128]};


export class Contract {
    spec: ContractSpec;
    constructor(public readonly options: ClassOptions) {
        this.spec = new ContractSpec([
            "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAwAAAAAAAAANb3duZXJfYWRkcmVzcwAAAAAAABMAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAATAAAAAAAAAAtmZWVfYWRkcmVzcwAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAGdXBkYXRlAAAAAAAHAAAAAAAAAA1vd25lcl9hZGRyZXNzAAAAAAAD6AAAABMAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAPoAAAAEwAAAAAAAAALZmVlX2FkZHJlc3MAAAAD6AAAABMAAAAAAAAAEm1heF9lbnRyeV9saWZldGltZQAAAAAD6AAAAAQAAAAAAAAAEW1heF9wYXltZW50X2NvdW50AAAAAAAD6AAAAAQAAAAAAAAAE21pbnRlcl9yb3lhbHR5X3JhdGUAAAAD6AAAAAsAAAAAAAAAEm1pbmVyX3JveWFsdHlfcmF0ZQAAAAAD6AAAAAsAAAAA",
        "AAAAAAAAAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAARoYXNoAAAD7gAAACAAAAAA",
        "AAAAAAAAAAAAAAALY29sb3JzX21pbmUAAAAABAAAAAAAAAAGc291cmNlAAAAAAATAAAAAAAAAAZjb2xvcnMAAAAAA+wAAAAEAAAABAAAAAAAAAAFbWluZXIAAAAAAAPoAAAAEwAAAAAAAAACdG8AAAAAA+gAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAPY29sb3JzX3RyYW5zZmVyAAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGY29sb3JzAAAAAAPqAAAD7QAAAAMAAAATAAAABAAAAAQAAAAA",
        "AAAAAAAAAAAAAAANY29sb3JfYmFsYW5jZQAAAAAAAAMAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAFY29sb3IAAAAAAAAEAAAAAAAAAAVtaW5lcgAAAAAAA+gAAAATAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAKZ2x5cGhfbWludAAAAAAABAAAAAAAAAAGbWludGVyAAAAAAATAAAAAAAAAAJ0bwAAAAAD6AAAABMAAAAAAAAABmNvbG9ycwAAAAAD7AAAABMAAAPsAAAABAAAA+oAAAAEAAAAAAAAAAV3aWR0aAAAAAAAA+gAAAAEAAAAAQAAA+gAAAPuAAAAIA==",
        "AAAAAAAAAAAAAAAOZ2x5cGhfdHJhbnNmZXIAAAAAAAIAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAloYXNoX3R5cGUAAAAAAAfQAAAACEhhc2hUeXBlAAAAAA==",
        "AAAAAAAAAAAAAAAMZ2x5cGhfc2NyYXBlAAAAAgAAAAAAAAACdG8AAAAAA+gAAAATAAAAAAAAAAloYXNoX3R5cGUAAAAAAAfQAAAACEhhc2hUeXBlAAAAAA==",
        "AAAAAAAAAAAAAAAJZ2x5cGhfZ2V0AAAAAAAAAQAAAAAAAAAJaGFzaF90eXBlAAAAAAAH0AAAAAhIYXNoVHlwZQAAAAEAAAPpAAAH0AAAAAlHbHlwaFR5cGUAAAAAAAAD",
        "AAAAAAAAAAAAAAAKb2ZmZXJfcG9zdAAAAAAAAgAAAAAAAAAEc2VsbAAAB9AAAAAFT2ZmZXIAAAAAAAAAAAAAA2J1eQAAAAfQAAAABU9mZmVyAAAAAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAMb2ZmZXJfZGVsZXRlAAAAAgAAAAAAAAAEc2VsbAAAB9AAAAAFT2ZmZXIAAAAAAAAAAAAAA2J1eQAAAAPoAAAH0AAAAAVPZmZlcgAAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAKb2ZmZXJzX2dldAAAAAAAAgAAAAAAAAAEc2VsbAAAB9AAAAAFT2ZmZXIAAAAAAAAAAAAAA2J1eQAAAAPoAAAH0AAAAAVPZmZlcgAAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACAAAAAAAAAAITm90Rm91bmQAAAABAAAAAAAAAAhOb3RFbXB0eQAAAAIAAAAAAAAADU5vdEF1dGhvcml6ZWQAAAAAAAADAAAAAAAAAAxOb3RQZXJtaXR0ZWQAAAAEAAAAAAAAAAxNaXNzaW5nV2lkdGgAAAAFAAAAAAAAAAlNaXNzaW5nSWQAAAAAAAAGAAAAAAAAAA5NaXNzaW5nQWRkcmVzcwAAAAAABwAAAAAAAAAKTWlzc2luZ0J1eQAAAAAACA==",
        "AAAAAgAAAAAAAAAAAAAAClN0b3JhZ2VLZXkAAAAAAA4AAAAAAAAAAAAAAAxPd25lckFkZHJlc3MAAAAAAAAAAAAAAAxUb2tlbkFkZHJlc3MAAAAAAAAAAAAAAApGZWVBZGRyZXNzAAAAAAAAAAAAAAAAABBNYXhFbnRyeUxpZmV0aW1lAAAAAAAAAAAAAAAPTWF4UGF5bWVudENvdW50AAAAAAAAAAAAAAAAEU1pbnRlclJveWFsdHlSYXRlAAAAAAAAAAAAAAAAAAAQTWluZXJSb3lhbHR5UmF0ZQAAAAEAAAAAAAAABUNvbG9yAAAAAAAAAwAAABMAAAATAAAABAAAAAEAAAAAAAAABkNvbG9ycwAAAAAAAQAAABMAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAEAAAPuAAAAIAAAAAEAAAAAAAAACkdseXBoT3duZXIAAAAAAAEAAAPuAAAAIAAAAAEAAAAAAAAAC0dseXBoTWludGVyAAAAAAEAAAPuAAAAIAAAAAEAAAAAAAAACkdseXBoT2ZmZXIAAAAAAAEAAAPuAAAAIAAAAAEAAAAAAAAACkFzc2V0T2ZmZXIAAAAAAAMAAAPuAAAAIAAAABMAAAAL",
        "AAAAAgAAAAAAAAAAAAAACEhhc2hUeXBlAAAAAgAAAAEAAAAAAAAABkNvbG9ycwAAAAAAAQAAABMAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAEAAAPuAAAAIA==",
        "AAAAAgAAAAAAAAAAAAAACUdseXBoVHlwZQAAAAAAAAIAAAABAAAAAAAAAAZDb2xvcnMAAAAAAAEAAAPsAAAAEwAAA+wAAAAEAAAD6gAAAAQAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAEAAAfQAAAABUdseXBoAAAA",
        "AAAAAQAAAAAAAAAAAAAABUdseXBoAAAAAAAAAwAAAAAAAAAGY29sb3JzAAAAAAPsAAAAEwAAA+wAAAAEAAAD6gAAAAQAAAAAAAAABmxlbmd0aAAAAAAABAAAAAAAAAAFd2lkdGgAAAAAAAAE",
        "AAAAAgAAAAAAAAAAAAAAC09mZmVyQ3JlYXRlAAAAAAIAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAIAAAPuAAAAIAAAB9AAAAAFT2ZmZXIAAAAAAAABAAAAAAAAAAVBc3NldAAAAAAAAAQAAAPuAAAAIAAAABMAAAATAAAACw==",
        "AAAAAgAAAAAAAAAAAAAABU9mZmVyAAAAAAAAAwAAAAEAAAAAAAAABUdseXBoAAAAAAAAAQAAA+4AAAAgAAAAAQAAAAAAAAAFQXNzZXQAAAAAAAACAAAAEwAAAAsAAAABAAAAAAAAAAlBc3NldFNlbGwAAAAAAAADAAAAEwAAABMAAAAL"
        ]);
    }
    private readonly parsers = {
        initialize: () => {},
        update: () => {},
        upgrade: () => {},
        colorsMine: () => {},
        colorsTransfer: () => {},
        colorBalance: (result: XDR_BASE64): u32 => this.spec.funcResToNative("color_balance", result),
        glyphMint: (result: XDR_BASE64): Option<Buffer> => this.spec.funcResToNative("glyph_mint", result),
        glyphTransfer: () => {},
        glyphScrape: () => {},
        glyphGet: (result: XDR_BASE64 | Err): Ok<GlyphType> | Err<Error_> => {
            if (result instanceof Err) return result
            return new Ok(this.spec.funcResToNative("glyph_get", result))
        },
        offerPost: (result: XDR_BASE64 | Err): Ok<void> | Err<Error_> => {
            if (result instanceof Err) return result
            return new Ok(this.spec.funcResToNative("offer_post", result))
        },
        offerDelete: (result: XDR_BASE64 | Err): Ok<void> | Err<Error_> => {
            if (result instanceof Err) return result
            return new Ok(this.spec.funcResToNative("offer_delete", result))
        },
        offersGet: (result: XDR_BASE64 | Err): Ok<void> | Err<Error_> => {
            if (result instanceof Err) return result
            return new Ok(this.spec.funcResToNative("offers_get", result))
        }
    };
    private txFromJSON = <T>(json: string): AssembledTransaction<T> => {
        const { method, ...tx } = JSON.parse(json)
        return AssembledTransaction.fromJSON(
            {
                ...this.options,
                method,
                parseResultXdr: this.parsers[method],
            },
            tx,
        );
    }
    public readonly fromJSON = {
        initialize: this.txFromJSON<ReturnType<typeof this.parsers['initialize']>>,
        update: this.txFromJSON<ReturnType<typeof this.parsers['update']>>,
        upgrade: this.txFromJSON<ReturnType<typeof this.parsers['upgrade']>>,
        colorsMine: this.txFromJSON<ReturnType<typeof this.parsers['colorsMine']>>,
        colorsTransfer: this.txFromJSON<ReturnType<typeof this.parsers['colorsTransfer']>>,
        colorBalance: this.txFromJSON<ReturnType<typeof this.parsers['colorBalance']>>,
        glyphMint: this.txFromJSON<ReturnType<typeof this.parsers['glyphMint']>>,
        glyphTransfer: this.txFromJSON<ReturnType<typeof this.parsers['glyphTransfer']>>,
        glyphScrape: this.txFromJSON<ReturnType<typeof this.parsers['glyphScrape']>>,
        glyphGet: this.txFromJSON<ReturnType<typeof this.parsers['glyphGet']>>,
        offerPost: this.txFromJSON<ReturnType<typeof this.parsers['offerPost']>>,
        offerDelete: this.txFromJSON<ReturnType<typeof this.parsers['offerDelete']>>,
        offersGet: this.txFromJSON<ReturnType<typeof this.parsers['offersGet']>>
    }
        /**
    * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    initialize = async ({owner_address, token_address, fee_address}: {owner_address: string, token_address: string, fee_address: string}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'initialize',
            args: this.spec.funcArgsToScVals("initialize", {owner_address: new Address(owner_address), token_address: new Address(token_address), fee_address: new Address(fee_address)}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['initialize'],
        });
    }


        /**
    * Construct and simulate a update transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    update = async ({owner_address, token_address, fee_address, max_entry_lifetime, max_payment_count, minter_royalty_rate, miner_royalty_rate}: {owner_address: Option<string>, token_address: Option<string>, fee_address: Option<string>, max_entry_lifetime: Option<u32>, max_payment_count: Option<u32>, minter_royalty_rate: Option<i128>, miner_royalty_rate: Option<i128>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'update',
            args: this.spec.funcArgsToScVals("update", {owner_address, token_address, fee_address, max_entry_lifetime, max_payment_count, minter_royalty_rate, miner_royalty_rate}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['update'],
        });
    }


        /**
    * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    upgrade = async ({hash}: {hash: Buffer}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'upgrade',
            args: this.spec.funcArgsToScVals("upgrade", {hash}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['upgrade'],
        });
    }


        /**
    * Construct and simulate a colors_mine transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    colorsMine = async ({source, colors, miner, to}: {source: string, colors: Map<u32, u32>, miner: Option<string>, to: Option<string>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'colors_mine',
            args: this.spec.funcArgsToScVals("colors_mine", {source: new Address(source), colors, miner, to}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['colorsMine'],
        });
    }


        /**
    * Construct and simulate a colors_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    colorsTransfer = async ({from, to, colors}: {from: string, to: string, colors: Array<readonly [string, u32, u32]>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'colors_transfer',
            args: this.spec.funcArgsToScVals("colors_transfer", {from: new Address(from), to: new Address(to), colors}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['colorsTransfer'],
        });
    }


        /**
    * Construct and simulate a color_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    colorBalance = async ({owner, color, miner}: {owner: string, color: u32, miner: Option<string>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'color_balance',
            args: this.spec.funcArgsToScVals("color_balance", {owner: new Address(owner), color, miner}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['colorBalance'],
        });
    }


        /**
    * Construct and simulate a glyph_mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    glyphMint = async ({minter, to, colors, width}: {minter: string, to: Option<string>, colors: Map<string, Map<u32, Array<u32>>>, width: Option<u32>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'glyph_mint',
            args: this.spec.funcArgsToScVals("glyph_mint", {minter: new Address(minter), to, colors, width}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['glyphMint'],
        });
    }


        /**
    * Construct and simulate a glyph_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    glyphTransfer = async ({to, hash_type}: {to: string, hash_type: HashType}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'glyph_transfer',
            args: this.spec.funcArgsToScVals("glyph_transfer", {to: new Address(to), hash_type}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['glyphTransfer'],
        });
    }


        /**
    * Construct and simulate a glyph_scrape transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    glyphScrape = async ({to, hash_type}: {to: Option<string>, hash_type: HashType}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'glyph_scrape',
            args: this.spec.funcArgsToScVals("glyph_scrape", {to, hash_type}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['glyphScrape'],
        });
    }


        /**
    * Construct and simulate a glyph_get transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    glyphGet = async ({hash_type}: {hash_type: HashType}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'glyph_get',
            args: this.spec.funcArgsToScVals("glyph_get", {hash_type}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['glyphGet'],
        });
    }


        /**
    * Construct and simulate a offer_post transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    offerPost = async ({sell, buy}: {sell: Offer, buy: Offer}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'offer_post',
            args: this.spec.funcArgsToScVals("offer_post", {sell, buy}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['offerPost'],
        });
    }


        /**
    * Construct and simulate a offer_delete transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    offerDelete = async ({sell, buy}: {sell: Offer, buy: Option<Offer>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'offer_delete',
            args: this.spec.funcArgsToScVals("offer_delete", {sell, buy}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['offerDelete'],
        });
    }


        /**
    * Construct and simulate a offers_get transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
    */
    offersGet = async ({sell, buy}: {sell: Offer, buy: Option<Offer>}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number,
    } = {}) => {
        return await AssembledTransaction.fromSimulation({
            method: 'offers_get',
            args: this.spec.funcArgsToScVals("offers_get", {sell, buy}),
            ...options,
            ...this.options,
            errorTypes: Errors,
            parseResultXdr: this.parsers['offersGet'],
        });
    }

}