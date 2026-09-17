import { Client } from "@soroshares/contract-client";
import { clientEnv } from "./env.client";

export function getOfferClient(
  address: string,
  signTransaction: (xdr: string) => Promise<string>,
  signAuthEntry: (entryXdr: string) => Promise<string>,
): Client {
  return new Client({
    contractId: clientEnv.NEXT_PUBLIC_OFFER_CONTRACT,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
    publicKey: address,
    signTransaction: async (xdr) => ({ signedTxXdr: await signTransaction(xdr) }),
    signAuthEntry: async (entryXdr) => ({ signedAuthEntry: await signAuthEntry(entryXdr) }),
  });
}
