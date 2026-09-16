import { BASE_FEE, Horizon, Keypair, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, HORIZON_URL, RPC_URL } from "./env";

export const horizonServer = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(RPC_URL);

/** Server-side classic transaction submission, signed with a Keypair we hold (not a wallet). */
export async function submitWithKeypair(
  sourceKeypair: Keypair,
  operations: xdr.Operation[],
): Promise<Horizon.HorizonApi.SubmitTransactionResponse> {
  const account = await horizonServer.loadAccount(sourceKeypair.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(60);
  for (const op of operations) builder.addOperation(op);
  const tx = builder.build();
  tx.sign(sourceKeypair);
  return horizonServer.submitTransaction(tx);
}
