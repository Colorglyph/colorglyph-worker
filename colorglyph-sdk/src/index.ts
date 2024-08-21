import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
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
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CARZSHD6BLSLB5ENFR76QI4VNJ2XUHXEDCRG77VMLOAICRG7MZTIZPA7",
  }
} as const

export const Errors = {
  1: {message:"NotFound"},

  2: {message:"NotEmpty"},

  3: {message:"NotAuthorized"},

  4: {message:"NotPermitted"},

  5: {message:"MissingWidth"},

  6: {message:"MissingId"},

  7: {message:"MissingAddress"},

  8: {message:"MissingBuy"},

  9: {message:"NotInitialized"}
}
export type StorageKey = {tag: "OwnerAddress", values: void} | {tag: "TokenAddress", values: void} | {tag: "FeeAddress", values: void} | {tag: "MaxEntryLifetime", values: void} | {tag: "MaxPaymentCount", values: void} | {tag: "MineMultiplier", values: void} | {tag: "MinterRoyaltyRate", values: void} | {tag: "MinerRoyaltyRate", values: void} | {tag: "Color", values: readonly [string, string, u32]} | {tag: "Glyph", values: readonly [Buffer]} | {tag: "GlyphOwner", values: readonly [Buffer]} | {tag: "GlyphMinter", values: readonly [Buffer]} | {tag: "GlyphOffer", values: readonly [Buffer]} | {tag: "AssetOffer", values: readonly [Buffer, string, i128]};


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
  glyph_mint: ({hash, minter, to, colors, width}: {hash: Buffer, minter: string, to: Option<string>, colors: Map<string, Map<u32, Array<u32>>>, width: Option<u32>}, options?: {
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
   * Construct and simulate a glyph_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  glyph_transfer: ({to, hash}: {to: string, hash: Buffer}, options?: {
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
  glyph_scrape: ({to, hash}: {to: Option<string>, hash: Buffer}, options?: {
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
  glyph_get: ({hash}: {hash: Buffer}, options?: {
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
  }) => Promise<AssembledTransaction<Result<Glyph>>>

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
        "AAAAAAAAAAAAAAAKZ2x5cGhfbWludAAAAAAABQAAAAAAAAAEaGFzaAAAA+4AAAAgAAAAAAAAAAZtaW50ZXIAAAAAABMAAAAAAAAAAnRvAAAAAAPoAAAAEwAAAAAAAAAGY29sb3JzAAAAAAPsAAAAEwAAA+wAAAAEAAAD6gAAAAQAAAAAAAAABXdpZHRoAAAAAAAD6AAAAAQAAAAA",
        "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" ]),
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
        glyph_mint: this.txFromJSON<null>,
        glyph_transfer: this.txFromJSON<null>,
        glyph_scrape: this.txFromJSON<null>,
        glyph_get: this.txFromJSON<Result<Glyph>>,
        offer_post: this.txFromJSON<Result<void>>,
        offer_delete: this.txFromJSON<Result<void>>,
        offers_get: this.txFromJSON<Result<void>>
  }
}