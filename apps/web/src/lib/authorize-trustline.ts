import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { clientEnv } from "./env.client";
import { serverEnv } from "./env.server";
import { horizonServer } from "./stellar";

export type AuthorizeResult =
  | { status: "AUTHORIZED"; txHash: string }
  | { status: "ALREADY_AUTHORIZED" }
  | { status: "NEEDS_TRUSTLINE" };

export async function authorizeDpriTrustline(account: string): Promise<AuthorizeResult> {
  const dpri = new Asset("DPRI", clientEnv.NEXT_PUBLIC_DPRI_ISSUER);
  const accountRecord = await horizonServer.loadAccount(account).catch((err) => {
    if (err?.response?.status === 404) return null;
    throw err;
  });
  if (!accountRecord) return { status: "NEEDS_TRUSTLINE" };

  const trustline = accountRecord.balances.find(
    (b): b is Extract<typeof b, { asset_code: string; asset_issuer: string }> =>
      "asset_code" in b && b.asset_code === dpri.getCode() && b.asset_issuer === dpri.getIssuer(),
  );

  if (!trustline) return { status: "NEEDS_TRUSTLINE" };
  if (trustline.is_authorized) return { status: "ALREADY_AUTHORIZED" };

  const issuerKeypair = Keypair.fromSecret(serverEnv.ISSUER_SECRET);
  const issuerAccount = await horizonServer.loadAccount(issuerKeypair.publicKey());
  const tx = new TransactionBuilder(issuerAccount, {
    fee: BASE_FEE,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.setTrustLineFlags({
        trustor: account,
        asset: dpri,
        flags: { authorized: true },
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(issuerKeypair);
  const result = await horizonServer.submitTransaction(tx);
  return { status: "AUTHORIZED", txHash: result.hash };
}
