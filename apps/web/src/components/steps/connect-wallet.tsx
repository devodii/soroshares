"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepCard, StepStatus } from "@/components/step-card";
import { useAccount } from "@/hooks/use-account";
import { useWallet } from "@/hooks/use-wallet";

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectWalletStep() {
  const { address, connecting, connect, disconnect } = useWallet();
  const { data: account, refetch } = useAccount(address);

  const status: StepStatus = address ? "done" : "active";

  async function handleConnect() {
    try {
      await connect();
    } catch (err) {
      toast.error("Connect failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleFund() {
    if (!address) return;
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (!res.ok) throw new Error(await res.text());
      toast.success("Funded with Friendbot");
      refetch();
    } catch (err) {
      toast.error("Friendbot failed", {
        description: err instanceof Error ? err.message : String(err),
      });
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
            <Button size="sm" onClick={handleFund}>
              Fund with Friendbot
            </Button>
          )}
        </div>
      )}
    </StepCard>
  );
}
