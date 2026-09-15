import { BASE_FEE, Horizon, Keypair, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE } from "./config.js";

export const horizon = new Horizon.Server(HORIZON_URL);

export async function submit(
  sourceSecret: string,
  ops: xdr.Operation[],
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  const kp = Keypair.fromSecret(sourceSecret);
  const account = await horizon.loadAccount(kp.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(60);
  for (const op of ops) builder.addOperation(op);
  const tx = builder.build();
  tx.sign(kp);
  return horizon.submitTransaction(tx);
}
