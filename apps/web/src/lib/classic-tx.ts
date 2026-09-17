import { BASE_FEE, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "./env";
import { horizonServer } from "./stellar";

export async function buildAndSign(
  address: string,
  operations: xdr.Operation[],
  signTransaction: (xdr: string) => Promise<string>,
): Promise<string> {
  const account = await horizonServer.loadAccount(address);
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(60);
  for (const op of operations) builder.addOperation(op);
  const tx = builder.build();
  return signTransaction(tx.toXdr());
}

export async function buildSignSubmit(
  address: string,
  operations: xdr.Operation[],
  signTransaction: (xdr: string) => Promise<string>,
): Promise<string> {
  const signedXdr = await buildAndSign(address, operations, signTransaction);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await horizonServer.submitTransaction(signedTx);
  return result.hash;
}
