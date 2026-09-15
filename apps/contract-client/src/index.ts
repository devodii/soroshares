import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
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
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const Errors = {
  1: { message: "AlreadyInitialized" },
  2: { message: "NotInitialized" },
  3: { message: "OfferClosed" },
  4: { message: "OfferOpen" },
  5: { message: "BelowMinimum" },
  6: { message: "NotWholeShares" },
  7: { message: "AlreadyFinalized" },
  8: { message: "NotFinalized" },
  9: { message: "AlreadyClaimed" },
  10: { message: "InsufficientShares" },
  11: { message: "GraceNotElapsed" },
  12: { message: "NothingToClaim" },
  13: { message: "Unauthorized" },
};

export interface Offer {
  admin: string;
  allotment_bps: u32;
  close_ledger: u32;
  finalized: boolean;
  grace_ledgers: u32;
  min_shares: i128;
  price: i128;
  share: string;
  total_shares: i128;
  usdc: string;
}

export type DataKey =
  | { tag: "Offer"; values: void }
  | { tag: "Sub"; values: readonly [string] }
  | { tag: "Claimed"; values: readonly [string] }
  | { tag: "Proceeds"; values: void };

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init: (
    {
      admin,
      usdc,
      share,
      price,
      min_shares,
      close_ledger,
      grace_ledgers,
    }: {
      admin: string;
      usdc: string;
      share: string;
      price: i128;
      min_shares: i128;
      close_ledger: u32;
      grace_ledgers: u32;
    },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim: (
    { subscriber }: { subscriber: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  refund: (
    { subscriber }: { subscriber: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a finalize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  finalize: (
    { admin, allotment_bps }: { admin: string; allotment_bps: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_offer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_offer: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<Offer>>>;

  /**
   * Construct and simulate a subscribe transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  subscribe: (
    { subscriber, shares }: { subscriber: string; shares: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a has_claimed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  has_claimed: (
    { subscriber }: { subscriber: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a deposit_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit_shares: (
    { admin, amount }: { admin: string; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_subscription transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_subscription: (
    { subscriber }: { subscriber: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a withdraw_proceeds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw_proceeds: (
    { admin, to }: { admin: string; to: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      },
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADQAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAALT2ZmZXJDbG9zZWQAAAAAAwAAAAAAAAAJT2ZmZXJPcGVuAAAAAAAABAAAAAAAAAAMQmVsb3dNaW5pbXVtAAAABQAAAAAAAAAOTm90V2hvbGVTaGFyZXMAAAAAAAYAAAAAAAAAEEFscmVhZHlGaW5hbGl6ZWQAAAAHAAAAAAAAAAxOb3RGaW5hbGl6ZWQAAAAIAAAAAAAAAA5BbHJlYWR5Q2xhaW1lZAAAAAAACQAAAAAAAAASSW5zdWZmaWNpZW50U2hhcmVzAAAAAAAKAAAAAAAAAA9HcmFjZU5vdEVsYXBzZWQAAAAACwAAAAAAAAAOTm90aGluZ1RvQ2xhaW0AAAAAAAwAAAAAAAAADFVuYXV0aG9yaXplZAAAAA0=",
        "AAAAAQAAAAAAAAAAAAAABU9mZmVyAAAAAAAACgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA1hbGxvdG1lbnRfYnBzAAAAAAAABAAAAAAAAAAMY2xvc2VfbGVkZ2VyAAAABAAAAAAAAAAJZmluYWxpemVkAAAAAAAAAQAAAAAAAAANZ3JhY2VfbGVkZ2VycwAAAAAAAAQAAAAAAAAACm1pbl9zaGFyZXMAAAAAAAsAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAFc2hhcmUAAAAAAAATAAAAAAAAAAx0b3RhbF9zaGFyZXMAAAALAAAAAAAAAAR1c2RjAAAAEw==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABU9mZmVyAAAAAAAAAQAAAAAAAAADU3ViAAAAAAEAAAATAAAAAQAAAAAAAAAHQ2xhaW1lZAAAAAABAAAAEwAAAAAAAAAAAAAACFByb2NlZWRz",
        "AAAABQAAAAAAAAAAAAAACkNsYWltRXZlbnQAAAAAAAEAAAALY2xhaW1fZXZlbnQAAAAAAwAAAAAAAAAKc3Vic2NyaWJlcgAAAAAAEwAAAAEAAAAAAAAACGFsbG90dGVkAAAACwAAAAAAAAAAAAAAC3JlZnVuZF91c2RjAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC1JlZnVuZEV2ZW50AAAAAAEAAAAMcmVmdW5kX2V2ZW50AAAAAgAAAAAAAAAKc3Vic2NyaWJlcgAAAAAAEwAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADUZpbmFsaXplRXZlbnQAAAAAAAABAAAADmZpbmFsaXplX2V2ZW50AAAAAAABAAAAAAAAAA1hbGxvdG1lbnRfYnBzAAAAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADlN1YnNjcmliZUV2ZW50AAAAAAABAAAAD3N1YnNjcmliZV9ldmVudAAAAAACAAAAAAAAAApzdWJzY3JpYmVyAAAAAAATAAAAAQAAAAAAAAAGc2hhcmVzAAAAAAALAAAAAAAAAAI=",
        "AAAAAAAAAAAAAAAEaW5pdAAAAAcAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAEdXNkYwAAABMAAAAAAAAABXNoYXJlAAAAAAAAEwAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAAptaW5fc2hhcmVzAAAAAAALAAAAAAAAAAxjbG9zZV9sZWRnZXIAAAAEAAAAAAAAAA1ncmFjZV9sZWRnZXJzAAAAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAAFY2xhaW0AAAAAAAABAAAAAAAAAApzdWJzY3JpYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAGcmVmdW5kAAAAAAABAAAAAAAAAApzdWJzY3JpYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAIZmluYWxpemUAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADWFsbG90bWVudF9icHMAAAAAAAAEAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAJZ2V0X29mZmVyAAAAAAAAAAAAAAEAAAPpAAAH0AAAAAVPZmZlcgAAAAAAAAM=",
        "AAAAAAAAAAAAAAAJc3Vic2NyaWJlAAAAAAAAAgAAAAAAAAAKc3Vic2NyaWJlcgAAAAAAEwAAAAAAAAAGc2hhcmVzAAAAAAALAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAALaGFzX2NsYWltZWQAAAAAAQAAAAAAAAAKc3Vic2NyaWJlcgAAAAAAEwAAAAEAAAAB",
        "AAAAAAAAAAAAAAAOZGVwb3NpdF9zaGFyZXMAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAQZ2V0X3N1YnNjcmlwdGlvbgAAAAEAAAAAAAAACnN1YnNjcmliZXIAAAAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAARd2l0aGRyYXdfcHJvY2VlZHMAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAAnRvAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    init: this.txFromJSON<Result<void>>,
    claim: this.txFromJSON<Result<void>>,
    refund: this.txFromJSON<Result<void>>,
    finalize: this.txFromJSON<Result<void>>,
    get_offer: this.txFromJSON<Result<Offer>>,
    subscribe: this.txFromJSON<Result<void>>,
    has_claimed: this.txFromJSON<boolean>,
    deposit_shares: this.txFromJSON<Result<void>>,
    get_subscription: this.txFromJSON<i128>,
    withdraw_proceeds: this.txFromJSON<Result<void>>,
  };
}
