import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { clientEnv } from "@/lib/env.client";
import { getErrorMessage } from "@/lib/error-message";

// SAC addresses are deterministic, so if another account already wrapped this
// asset (likely for a well-known one like testnet USDC), we fall back to the
// computed address instead of failing.
export async function ensureStellarAssetContract(
  rpcServer: rpc.Server,
  asset: Asset,
  sourceKeypair: Keypair,
): Promise<string> {
  const expectedId = asset.contractId(clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE);

  try {
    await rpcServer.getContractInstance(expectedId);
    return expectedId;
  } catch {}

  const account = await rpcServer.getAccount(sourceKeypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
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
    const message = getErrorMessage(err);
    if (!message.includes("ExistingValue") && !message.includes("already exists")) throw err;
  }

  return expectedId;
}
