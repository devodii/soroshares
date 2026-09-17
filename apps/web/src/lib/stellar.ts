import { BASE_FEE, Horizon, Keypair, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { clientEnv } from "./env.client";

export const horizonServer = new Horizon.Server(clientEnv.NEXT_PUBLIC_HORIZON_URL);
export const rpcServer = new rpc.Server(clientEnv.NEXT_PUBLIC_RPC_URL);

export async function submitWithKeypair(
  sourceKeypair: Keypair,
  operations: xdr.Operation[],
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  const account = await horizonServer.loadAccount(sourceKeypair.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
  }).setTimeout(60);
  for (const op of operations) builder.addOperation(op);
  const tx = builder.build();
  tx.sign(sourceKeypair);
  return horizonServer.submitTransaction(tx);
}
