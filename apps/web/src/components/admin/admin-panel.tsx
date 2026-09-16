"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOffer } from "@/hooks/use-offer";
import { useWallet } from "@/hooks/use-wallet";
import { getOfferClient } from "@/lib/contract";
import { ADMIN_PUBLIC } from "@/lib/env";

export function AdminPanel() {
  const { address, connecting, connect, signTransaction, signAuthEntry } = useWallet();
  const { data: offer, refetch } = useOffer();
  const [allotmentPct, setAllotmentPct] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = address === ADMIN_PUBLIC;

  async function handleFinalize() {
    if (!address) return;
    setSubmitting(true);
    try {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.finalize({ admin: address, allotment_bps: allotmentPct * 100 });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
      toast.success("Offer finalized");
      refetch();
    } catch (err) {
      toast.error("Finalize failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!address) return;
    setSubmitting(true);
    try {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.withdraw_proceeds({ admin: address, to: address });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
      toast.success("Proceeds withdrawn");
      refetch();
    } catch (err) {
      toast.error("Withdraw failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <h1 className="text-xl font-semibold">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Offer state</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            Total subscribed: {offer ? (BigInt(offer.total_shares) / 10_000_000n).toString() : "…"}
          </div>
          <div>Finalized: {offer?.finalized ? `yes (${offer.allotment_bps / 100}%)` : "no"}</div>
          <div>Close ledger: {offer?.close_ledger ?? "…"}</div>
        </CardContent>
      </Card>

      {!address && (
        <Button onClick={() => connect()} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect admin wallet"}
        </Button>
      )}

      {address && !isAdmin && (
        <Alert variant="destructive">
          <AlertDescription>
            Connected wallet does not match the admin account for this offer.
          </AlertDescription>
        </Alert>
      )}

      {address && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Finalize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="allotment">Allotment %</Label>
              <Input
                id="allotment"
                type="number"
                min={0}
                max={100}
                value={allotmentPct}
                onChange={(e) => setAllotmentPct(Number(e.target.value))}
                disabled={offer?.finalized}
              />
            </div>
            <Button onClick={handleFinalize} disabled={submitting || offer?.finalized}>
              {submitting ? "Submitting…" : "Finalize"}
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={submitting || !offer?.finalized}
              variant="secondary"
            >
              Withdraw proceeds
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
