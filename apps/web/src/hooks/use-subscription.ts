"use client";

import { Client } from "@soroshares/contract-client";
import { useQuery } from "@tanstack/react-query";
import { clientEnv } from "@/lib/env.client";

function readOnlyClient(): Client {
  return new Client({
    contractId: clientEnv.NEXT_PUBLIC_OFFER_CONTRACT,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
  });
}

export function useSubscription(address: string | null) {
  return useQuery({
    queryKey: ["subscription", address],
    queryFn: async () => {
      const client = readOnlyClient();
      const [sharesTx, claimedTx] = await Promise.all([
        client.get_subscription({ subscriber: address as string }),
        client.has_claimed({ subscriber: address as string }),
      ]);
      return { shares: sharesTx.result as bigint, claimed: claimedTx.result as boolean };
    },
    enabled: Boolean(address),
    refetchInterval: 5000,
  });
}
