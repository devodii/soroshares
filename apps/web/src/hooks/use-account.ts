"use client";

import { Asset, NotFoundError } from "@stellar/stellar-sdk";
import { useQuery } from "@tanstack/react-query";
import { clientEnv } from "@/lib/env.client";
import { horizonServer } from "@/lib/stellar";
import { findTrustline } from "@/lib/trustline";

export interface AccountBalances {
  exists: boolean;
  xlm: string;
  usdc: string;
  usdcTrustline: boolean;
  dpri: string;
  dpriAuthorized: boolean;
}

async function fetchAccount(address: string): Promise<AccountBalances> {
  try {
    const account = await horizonServer.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    const usdc = findTrustline(account.balances, new Asset("USDC", clientEnv.NEXT_PUBLIC_USDC_ISSUER));
    const dpri = findTrustline(account.balances, new Asset("DPRI", clientEnv.NEXT_PUBLIC_DPRI_ISSUER));
    return {
      exists: true,
      xlm: native?.balance ?? "0",
      usdc: usdc?.balance ?? "0",
      usdcTrustline: Boolean(usdc),
      dpri: dpri?.balance ?? "0",
      dpriAuthorized: dpri?.is_authorized ?? false,
    };
  } catch (err) {
    if (err instanceof NotFoundError) {
      return {
        exists: false,
        xlm: "0",
        usdc: "0",
        usdcTrustline: false,
        dpri: "0",
        dpriAuthorized: false,
      };
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
