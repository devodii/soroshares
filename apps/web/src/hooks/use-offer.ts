"use client";

import { useQuery } from "@tanstack/react-query";

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

async function fetchOffer(): Promise<OfferState> {
  const res = await fetch("/api/offer");
  if (!res.ok) throw new Error((await res.json()).error ?? "failed to load offer");
  return res.json();
}

export function useOffer() {
  return useQuery({
    queryKey: ["offer"],
    queryFn: fetchOffer,
    refetchInterval: 5000,
  });
}
