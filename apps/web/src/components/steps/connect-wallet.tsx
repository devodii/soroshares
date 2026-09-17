"use client";

import { Asset, Operation } from "@stellar/stellar-sdk";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepCard, StepStatus } from "@/components/step-card";
import { useAccount } from "@/hooks/use-account";
import { useWallet } from "@/hooks/use-wallet";
import { apiFetch } from "@/lib/api-client";
import { buildAndSign } from "@/lib/classic-tx";
import { clientEnv } from "@/lib/env.client";
import { getErrorMessage } from "@/lib/error-message";
import { FAUCET_AMOUNT } from "@/lib/faucet";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectWalletStep() {
  const { address, connecting, connect, disconnect, signTransaction } = useWallet();
  const { data: account, refetch } = useAccount(address);
  const [funding, setFunding] = React.useState(false);

  const status: StepStatus = address ? "done" : "active";

  async function handleConnect() {
    try {
      await connect();
    } catch (err) {
      toast.error("Connect failed", {
        description: getErrorMessage(err),
      });
    }
  }

  async function handleFund() {
    if (!address) return;
    setFunding(true);
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (!res.ok) throw new Error(await res.text());
      toast.success("Funded with Friendbot");

      try {
        const signedXdr = await buildAndSign(
          address,
          [
            Operation.changeTrust({ asset: new Asset("USDC", clientEnv.NEXT_PUBLIC_USDC_ISSUER) }),
            Operation.payment({
              destination: address,
              asset: new Asset("USDC", clientEnv.NEXT_PUBLIC_USDC_ISSUER),
              amount: FAUCET_AMOUNT,
              source: clientEnv.NEXT_PUBLIC_USDC_ISSUER,
            }),
          ],
          signTransaction,
        );
        await apiFetch("/api/faucet/usdc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signedXdr }),
        });
        toast.success("Funded with test USDC");
      } catch (err) {
        toast.error("USDC funding failed", {
          description: getErrorMessage(err),
        });
      }

      refetch();
    } catch (err) {
      toast.error("Friendbot failed", {
        description: getErrorMessage(err),
      });
    } finally {
      setFunding(false);
    }
  }

  return (
    <StepCard step={1} title="Connect wallet" status={status}>
      {!address && (
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
      )}
      {address && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono">{truncate(address)}</span>
            <Button variant="outline" size="sm" onClick={() => disconnect()}>
              Disconnect
            </Button>
          </div>
          {account && (
            <div className="space-y-1 text-muted-foreground">
              <div>XLM: {account.xlm}</div>
              <div>USDC: {account.usdc}</div>
              <div>
                DPRI: {account.dpri} {account.dpriAuthorized ? "(authorized)" : ""}
              </div>
            </div>
          )}
          {account && !account.exists && (
            <Button size="sm" onClick={handleFund} disabled={funding}>
              {funding ? "Funding…" : "Fund with Friendbot"}
            </Button>
          )}
        </div>
      )}
    </StepCard>
  );
}
