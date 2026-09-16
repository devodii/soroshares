import { Client } from "@soroshares/contract-client";
import { apiHandler } from "@/lib/api-handler";
import { NETWORK_PASSPHRASE, OFFER_CONTRACT, RPC_URL } from "@/lib/env";

export const GET = apiHandler({
  rateLimit: 60,
  handler: async () => {
    const client = new Client({
      contractId: OFFER_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    });
    const tx = await client.get_offer();
    const offer = tx.result.unwrap();
    return {
      admin: offer.admin,
      usdc: offer.usdc,
      share: offer.share,
      price: offer.price.toString(),
      min_shares: offer.min_shares.toString(),
      close_ledger: offer.close_ledger,
      grace_ledgers: offer.grace_ledgers,
      total_shares: offer.total_shares.toString(),
      finalized: offer.finalized,
      allotment_bps: offer.allotment_bps,
      contract: OFFER_CONTRACT,
    };
  },
});
