"use client";

import { useQuery } from "@tanstack/react-query";
import { rpcServer } from "@/lib/stellar";

export function useLatestLedger() {
  return useQuery({
    queryKey: ["latest-ledger"],
    queryFn: async () => (await rpcServer.getLatestLedger()).sequence,
    refetchInterval: 5000,
  });
}
