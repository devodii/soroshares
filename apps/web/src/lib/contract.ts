import { Client } from "@soroshares/contract-client";
import { NETWORK_PASSPHRASE, OFFER_CONTRACT, RPC_URL } from "./env";

export function getOfferClient(
  address: string,
  signTransaction: (xdr: string) => Promise<string>,
  signAuthEntry: (entryXdr: string) => Promise<string>,
): Client {
  return new Client({
    contractId: OFFER_CONTRACT,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: address,
    signTransaction: async (xdr) => ({ signedTxXdr: await signTransaction(xdr) }),
    signAuthEntry: async (entryXdr) => ({ signedAuthEntry: await signAuthEntry(entryXdr) }),
  });
}
