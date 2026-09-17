import { Client } from "@soroshares/contract-client";
import { apiHandler } from "@/lib/api-handler";
import { clientEnv } from "@/lib/env.client";

export const GET = apiHandler({
  rateLimit: 60,
  handler: async () => {
    const client = new Client({
      contractId: clientEnv.NEXT_PUBLIC_OFFER_CONTRACT,
      networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
      rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
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
      contract: clientEnv.NEXT_PUBLIC_OFFER_CONTRACT,
    };
  },
});
