"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface OfferState {
  admin: string;
  usdc: string;
  share: string;
  price: string;
  min_shares: string;
  close_ledger: number;
  grace_ledgers: number;
  total_shares: string;
  finalized: boolean;
  allotment_bps: number;
  contract: string;
}

export function useOffer() {
  return useQuery({
    queryKey: ["offer"],
    queryFn: () => apiFetch<OfferState>("/api/offer"),
    refetchInterval: 5000,
  });
}
