"use client";

import { Client } from "contract-client";
import { useQuery } from "@tanstack/react-query";
import { NETWORK_PASSPHRASE, OFFER_CONTRACT, RPC_URL } from "@/lib/env";

function readOnlyClient(): Client {
  return new Client({
    contractId: OFFER_CONTRACT,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
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
