"use client";

import { Asset, NotFoundError } from "@stellar/stellar-sdk";
import { useQuery } from "@tanstack/react-query";
import { DPRI_ISSUER, USDC_ISSUER } from "@/lib/env";
import { horizonServer } from "@/lib/stellar";
import { findTrustline } from "@/lib/trustline";

export interface AccountBalances {
  exists: boolean;
  xlm: string;
  usdc: string;
  dpri: string;
  dpriAuthorized: boolean;
}

async function fetchAccount(address: string): Promise<AccountBalances> {
  try {
    const account = await horizonServer.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    const usdc = findTrustline(account.balances, new Asset("USDC", USDC_ISSUER));
    const dpri = findTrustline(account.balances, new Asset("DPRI", DPRI_ISSUER));
    return {
      exists: true,
      xlm: native?.balance ?? "0",
      usdc: usdc?.balance ?? "0",
      dpri: dpri?.balance ?? "0",
      dpriAuthorized: dpri?.is_authorized ?? false,
    };
  } catch (err) {
    if (err instanceof NotFoundError) {
      return { exists: false, xlm: "0", usdc: "0", dpri: "0", dpriAuthorized: false };
    }
    throw err;
  }
}

export function useAccount(address: string | null) {
  return useQuery({
    queryKey: ["account", address],
    queryFn: () => fetchAccount(address as string),
    enabled: Boolean(address),
    refetchInterval: 5000,
  });
}
