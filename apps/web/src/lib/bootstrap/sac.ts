import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "@/lib/env";

/**
 * Wraps a classic asset into its Stellar Asset Contract via pure RPC + SDK
 * calls — no `stellar` CLI, so this runs anywhere Node runs, Vercel included.
 * SAC addresses are deterministic, so if another account already wrapped this
 * asset (very likely for a well-known asset like testnet USDC), this falls
 * back to the computed address instead of failing.
 */
export async function ensureStellarAssetContract(
  rpcServer: rpc.Server,
  asset: Asset,
  sourceKeypair: Keypair,
): Promise<string> {
  const expectedId = asset.contractId(NETWORK_PASSPHRASE);

  try {
    await rpcServer.getContractInstance(expectedId);
    return expectedId;
  } catch {
    // not yet instantiated, deploy below
  }

  const account = await rpcServer.getAccount(sourceKeypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.createStellarAssetContract({ asset }))
    .setTimeout(60)
    .build();

  try {
    const prepared = await rpcServer.prepareTransaction(tx);
    prepared.sign(sourceKeypair);
    const sent = await rpcServer.sendTransaction(prepared);
    const final = await rpcServer.pollTransaction(sent.hash, { attempts: 30 });
    if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(
        `SAC deploy for ${asset.code}:${asset.issuer} failed: ${JSON.stringify(final)}`,
      );
    }
  } catch (err) {
    // Another actor may have deployed it between our check and this attempt.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("ExistingValue") && !message.includes("already exists")) throw err;
  }

  return expectedId;
}
