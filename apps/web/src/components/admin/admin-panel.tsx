"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Result } from "better-result";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBootstrapStatus, useRunBootstrap } from "@/hooks/use-bootstrap";
import { useLatestLedger } from "@/hooks/use-latest-ledger";
import { useOffer } from "@/hooks/use-offer";
import { useWallet } from "@/hooks/use-wallet";
import { getOfferClient } from "@/lib/contract";
import { clientEnv } from "@/lib/env.client";
import { getErrorMessage } from "@/lib/error-message";
import { formatLedgerCountdown } from "@/lib/format-duration";

const finalizeSchema = z.object({
  allotmentPct: z.number().min(0, "Must be at least 0").max(100, "Must be at most 100"),
});

type FinalizeFormValues = z.infer<typeof finalizeSchema>;

export function AdminPanel() {
  const { address, connecting, connect, signTransaction, signAuthEntry } = useWallet();
  const { data: offer, refetch } = useOffer();
  const { data: latestLedger } = useLatestLedger();
  const { data: bootstrapStatus } = useBootstrapStatus();
  const runBootstrap = useRunBootstrap();
  const finalizeForm = useForm<FinalizeFormValues>({
    resolver: zodResolver(finalizeSchema),
    defaultValues: { allotmentPct: 60 },
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmRedeploy, setConfirmRedeploy] = React.useState(false);

  const isAdmin = address === clientEnv.NEXT_PUBLIC_ADMIN_PUBLIC;

  async function handleBootstrap(redeploy: boolean) {
    const result = await Result.tryPromise(() => runBootstrap.mutateAsync({ redeploy }));
    result.match({
      ok: () => {
        toast.success(redeploy ? "Redeployed a fresh offer" : "Bootstrap complete");
        refetch();
      },
      err: (err) => {
        toast.error("Bootstrap failed", { description: getErrorMessage(err) });
      },
    });
    setConfirmRedeploy(false);
  }

  async function onFinalize(values: FinalizeFormValues) {
    if (!address) return;
    const result = await Result.tryPromise(async () => {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.finalize({
        admin: address,
        allotment_bps: values.allotmentPct * 100,
      });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
    });
    result.match({
      ok: () => {
        toast.success("Offer finalized");
        refetch();
      },
      err: (err) => {
        finalizeForm.setError("allotmentPct", { message: getErrorMessage(err) });
      },
    });
  }

  async function handleWithdraw() {
    if (!address) return;
    setSubmitting(true);
    const result = await Result.tryPromise(async () => {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.withdraw_proceeds({ admin: address, to: address });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
    });
    result.match({
      ok: () => {
        toast.success("Proceeds withdrawn");
        refetch();
      },
      err: (err) => {
        toast.error("Withdraw failed", { description: getErrorMessage(err) });
      },
    });
    setSubmitting(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
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
          <div>
            Close ledger: {offer?.close_ledger ?? "…"}
            {latestLedger && offer && latestLedger < offer.close_ledger
              ? ` (~${formatLedgerCountdown(offer.close_ledger - latestLedger)} left)`
              : ""}
          </div>
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
            <p className="text-sm text-muted-foreground">
              Sets the allotment % for every subscriber at once. Nothing moves automatically —
              each subscriber then calls claim themselves to receive their shares and refund.
            </p>
            <form onSubmit={finalizeForm.handleSubmit(onFinalize)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="allotment">Allotment %</Label>
                <Input
                  id="allotment"
                  type="number"
                  disabled={offer?.finalized}
                  {...finalizeForm.register("allotmentPct", { valueAsNumber: true })}
                />
                {finalizeForm.formState.errors.allotmentPct && (
                  <p className="text-xs text-destructive">
                    {finalizeForm.formState.errors.allotmentPct.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={finalizeForm.formState.isSubmitting || offer?.finalized}
              >
                {finalizeForm.formState.isSubmitting ? "Submitting…" : "Finalize"}
              </Button>
            </form>
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

      <details className="rounded-lg border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Setup tools</summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            One-time provisioning: funds the issuer/admin, issues DPRI, deploys the offer
            contract, and funds it. Safe to run repeatedly; already-completed steps are skipped.
            You should not need this once an offer is already live.
          </p>
          {bootstrapStatus && "offerContract" in bootstrapStatus && (
            <p className="font-mono text-xs break-all">contract: {bootstrapStatus.offerContract}</p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => handleBootstrap(false)}
              disabled={runBootstrap.isPending}
              variant="outline"
            >
              {runBootstrap.isPending ? "Running…" : "Run bootstrap"}
            </Button>
            {!confirmRedeploy && (
              <Button
                onClick={() => setConfirmRedeploy(true)}
                disabled={runBootstrap.isPending}
                variant="outline"
              >
                Redeploy fresh offer
              </Button>
            )}
            {confirmRedeploy && (
              <>
                <Button
                  onClick={() => handleBootstrap(true)}
                  disabled={runBootstrap.isPending}
                  variant="destructive"
                >
                  {runBootstrap.isPending ? "Redeploying…" : "Confirm: replace the live offer"}
                </Button>
                <Button
                  onClick={() => setConfirmRedeploy(false)}
                  disabled={runBootstrap.isPending}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
