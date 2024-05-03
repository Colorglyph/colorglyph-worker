import { ContractSpec, Address } from '@stellar/stellar-sdk';
import { Buffer } from "buffer";
import {
  AssembledTransaction,
  ContractClient,
  ContractClientOptions,
} from '@stellar/stellar-sdk/lib/contract_client/index.js';
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
} from '@stellar/stellar-sdk/lib/contract_client';
import { Result } from '@stellar/stellar-sdk/lib/rust_types/index.js';
export * from '@stellar/stellar-sdk'
export * from '@stellar/stellar-sdk/lib/contract_client/index.js'
export * from '@stellar/stellar-sdk/lib/rust_types/index.js'

if (typeof window !== 'undefined') {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  futurenet: {
    networkPassphrase: "Test SDF Future Network ; October 2022",
    contractId: "CB3MSUTY6O2XMYL2P3V2J4SPPGGZSRRFLUPSCFAHNBMTYO4FJ6HOYNP3",
  }
} as const

export const Errors = {
  1: {message:""},
  2: {message:""},
  3: {message:""},
  4: {message:""},
  5: {message:""},
  6: {message:""},
  7: {message:""},
  8: {message:""},
  9: {message:""}
}
export type StorageKey = {tag: "OwnerAddress", values: void} | {tag: "TokenAddress", values: void} | {tag: "FeeAddress", values: void} | {tag: "MaxEntryLifetime", values: void} | {tag: "MaxPaymentCount", values: void} | {tag: "MineMultiplier", values: void} | {tag: "MinterRoyaltyRate", values: void} | {tag: "MinerRoyaltyRate", values: void} | {tag: "Color", values: readonly [string, string, u32]} | {tag: "Colors", values: readonly [string]} | {tag: "Glyph", values: readonly [Buffer]} | {tag: "GlyphOwner", values: readonly [Buffer]} | {tag: "GlyphMinter", values: readonly [Buffer]} | {tag: "GlyphOffer", values: readonly [Buffer]} | {tag: "AssetOffer", values: readonly [Buffer, string, i128]};

export type HashType = {tag: "Colors", values: readonly [string]} | {tag: "Glyph", values: readonly [Buffer]};

export type GlyphType = {tag: "Colors", values: readonly [Map<string, Map<u32, Array<u32>>>]} | {tag: "Glyph", values: readonly [Glyph]};


export interface Glyph {
  colors: Map<string, Map<u32, Array<u32>>>;
  length: u32;
  width: u32;
}

export type OfferCreate = {tag: "Glyph", values: readonly [Buffer, Offer]} | {tag: "Asset", values: readonly [Buffer, string, string, i128]};

export type Offer = {tag: "Glyph", values: readonly [Buffer]} | {tag: "Asset", values: readonly [string, i128]} | {tag: "AssetSell", values: readonly [string, string, i128]};


export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({owner_address, token_address, fee_address, mine_multiplier}: {owner_address: string, token_address: string, fee_address: string, mine_multiplier: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a update transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update: ({owner_address, token_address, fee_address, max_entry_lifetime, max_payment_count, mine_multiplier, minter_royalty_rate, miner_royalty_rate}: {owner_address: Option<string>, token_address: Option<string>, fee_address: Option<string>, max_entry_lifetime: Option<u32>, max_payment_count: Option<u32>, mine_multiplier: Option<i128>, minter_royalty_rate: Option<i128>, miner_royalty_rate: Option<i128>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade: ({hash}: {hash: Buffer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a colors_mine transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  colors_mine: ({source, colors, miner, to}: {source: string, colors: Map<u32, u32>, miner: Option<string>, to: Option<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a colors_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  colors_transfer: ({from, to, colors}: {from: string, to: string, colors: Array<readonly [string, u32, u32]>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a color_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  color_balance: ({owner, color, miner}: {owner: string, color: u32, miner: Option<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a glyph_mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  glyph_mint: ({minter, to, colors, width}: {minter: string, to: Option<string>, colors: Map<string, Map<u32, Array<u32>>>, width: Option<u32>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<Buffer>>>

  /**
   * Construct and simulate a glyph_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  glyph_transfer: ({to, hash_type}: {to: string, hash_type: HashType}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a glyph_scrape transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  glyph_scrape: ({to, hash_type}: {to: Option<string>, hash_type: HashType}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a glyph_get transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  glyph_get: ({hash_type}: {hash_type: HashType}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<GlyphType>>>

  /**
   * Construct and simulate a offer_post transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  offer_post: ({sell, buy}: {sell: Offer, buy: Offer}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a offer_delete transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  offer_delete: ({sell, buy}: {sell: Offer, buy: Option<Offer>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a offers_get transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  offers_get: ({sell, buy}: {sell: Offer, buy: Option<Offer>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABAAAAAAAAAANb3duZXJfYWRkcmVzcwAAAAAAABMAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAATAAAAAAAAAAtmZWVfYWRkcmVzcwAAAAATAAAAAAAAAA9taW5lX211bHRpcGxpZXIAAAAACwAAAAA=",
        "AAAAAAAAAAAAAAAGdXBkYXRlAAAAAAAIAAAAAAAAAA1vd25lcl9hZGRyZXNzAAAAAAAD6AAAABMAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAPoAAAAEwAAAAAAAAALZmVlX2FkZHJlc3MAAAAD6AAAABMAAAAAAAAAEm1heF9lbnRyeV9saWZldGltZQAAAAAD6AAAAAQAAAAAAAAAEW1heF9wYXltZW50X2NvdW50AAAAAAAD6AAAAAQAAAAAAAAAD21pbmVfbXVsdGlwbGllcgAAAAPoAAAACwAAAAAAAAATbWludGVyX3JveWFsdHlfcmF0ZQAAAAPoAAAACwAAAAAAAAASbWluZXJfcm95YWx0eV9yYXRlAAAAAAPoAAAACwAAAAA=",
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
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAAITm90Rm91bmQAAAABAAAAAAAAAAhOb3RFbXB0eQAAAAIAAAAAAAAADU5vdEF1dGhvcml6ZWQAAAAAAAADAAAAAAAAAAxOb3RQZXJtaXR0ZWQAAAAEAAAAAAAAAAxNaXNzaW5nV2lkdGgAAAAFAAAAAAAAAAlNaXNzaW5nSWQAAAAAAAAGAAAAAAAAAA5NaXNzaW5nQWRkcmVzcwAAAAAABwAAAAAAAAAKTWlzc2luZ0J1eQAAAAAACAAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAk=",
        "AAAAAgAAAAAAAAAAAAAAClN0b3JhZ2VLZXkAAAAAAA8AAAAAAAAAAAAAAAxPd25lckFkZHJlc3MAAAAAAAAAAAAAAAxUb2tlbkFkZHJlc3MAAAAAAAAAAAAAAApGZWVBZGRyZXNzAAAAAAAAAAAAAAAAABBNYXhFbnRyeUxpZmV0aW1lAAAAAAAAAAAAAAAPTWF4UGF5bWVudENvdW50AAAAAAAAAAAAAAAADk1pbmVNdWx0aXBsaWVyAAAAAAAAAAAAAAAAABFNaW50ZXJSb3lhbHR5UmF0ZQAAAAAAAAAAAAAAAAAAEE1pbmVyUm95YWx0eVJhdGUAAAABAAAAAAAAAAVDb2xvcgAAAAAAAAMAAAATAAAAEwAAAAQAAAABAAAAAAAAAAZDb2xvcnMAAAAAAAEAAAATAAAAAQAAAAAAAAAFR2x5cGgAAAAAAAABAAAD7gAAACAAAAABAAAAAAAAAApHbHlwaE93bmVyAAAAAAABAAAD7gAAACAAAAABAAAAAAAAAAtHbHlwaE1pbnRlcgAAAAABAAAD7gAAACAAAAABAAAAAAAAAApHbHlwaE9mZmVyAAAAAAABAAAD7gAAACAAAAABAAAAAAAAAApBc3NldE9mZmVyAAAAAAADAAAD7gAAACAAAAATAAAACw==",
        "AAAAAgAAAAAAAAAAAAAACEhhc2hUeXBlAAAAAgAAAAEAAAAAAAAABkNvbG9ycwAAAAAAAQAAABMAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAEAAAPuAAAAIA==",
        "AAAAAgAAAAAAAAAAAAAACUdseXBoVHlwZQAAAAAAAAIAAAABAAAAAAAAAAZDb2xvcnMAAAAAAAEAAAPsAAAAEwAAA+wAAAAEAAAD6gAAAAQAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAEAAAfQAAAABUdseXBoAAAA",
        "AAAAAQAAAAAAAAAAAAAABUdseXBoAAAAAAAAAwAAAAAAAAAGY29sb3JzAAAAAAPsAAAAEwAAA+wAAAAEAAAD6gAAAAQAAAAAAAAABmxlbmd0aAAAAAAABAAAAAAAAAAFd2lkdGgAAAAAAAAE",
        "AAAAAgAAAAAAAAAAAAAAC09mZmVyQ3JlYXRlAAAAAAIAAAABAAAAAAAAAAVHbHlwaAAAAAAAAAIAAAPuAAAAIAAAB9AAAAAFT2ZmZXIAAAAAAAABAAAAAAAAAAVBc3NldAAAAAAAAAQAAAPuAAAAIAAAABMAAAATAAAACw==",
        "AAAAAgAAAAAAAAAAAAAABU9mZmVyAAAAAAAAAwAAAAEAAAAAAAAABUdseXBoAAAAAAAAAQAAA+4AAAAgAAAAAQAAAAAAAAAFQXNzZXQAAAAAAAACAAAAEwAAAAsAAAABAAAAAAAAAAlBc3NldFNlbGwAAAAAAAADAAAAEwAAABMAAAAL" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        update: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        colors_mine: this.txFromJSON<null>,
        colors_transfer: this.txFromJSON<null>,
        color_balance: this.txFromJSON<u32>,
        glyph_mint: this.txFromJSON<Option<Buffer>>,
        glyph_transfer: this.txFromJSON<null>,
        glyph_scrape: this.txFromJSON<null>,
        glyph_get: this.txFromJSON<Result<GlyphType>>,
        offer_post: this.txFromJSON<Result<void>>,
        offer_delete: this.txFromJSON<Result<void>>,
        offers_get: this.txFromJSON<Result<void>>
  }
}