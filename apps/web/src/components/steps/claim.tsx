"use client";

import { Result } from "better-result";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepCard, StepStatus } from "@/components/step-card";
import { useLatestLedger } from "@/hooks/use-latest-ledger";
import { useOffer } from "@/hooks/use-offer";
import { useSubscription } from "@/hooks/use-subscription";
import { useWallet } from "@/hooks/use-wallet";
import { getOfferClient } from "@/lib/contract";
import { getErrorMessage } from "@/lib/error-message";
import { formatLedgerCountdown } from "@/lib/format-duration";

const STROOP = 10_000_000n;

export function ClaimStep() {
  const { address, signTransaction, signAuthEntry } = useWallet();
  const { data: offer, refetch: refetchOffer } = useOffer();
  const { data: latestLedger } = useLatestLedger();
  const { data: subscription, refetch: refetchSubscription } = useSubscription(address);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ kind: "claim" | "refund"; txHash: string } | null>(
    null,
  );

  const hasSubscription = Boolean(subscription && subscription.shares > 0n);
  const closed = Boolean(latestLedger && offer && latestLedger >= offer.close_ledger);
  const graceElapsed = Boolean(
    latestLedger && offer && latestLedger >= offer.close_ledger + offer.grace_ledgers,
  );
  const canRefund = Boolean(offer && !offer.finalized && graceElapsed);
  const canClaim = Boolean(offer?.finalized);

  const status: StepStatus = !hasSubscription
    ? "pending"
    : result || subscription?.claimed
      ? "done"
      : closed
        ? "active"
        : "pending";

  async function handleClaim() {
    if (!address) return;
    setSubmitting(true);
    const result = await Result.tryPromise(async () => {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.claim({ subscriber: address });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
      return sent.sendTransactionResponse?.hash ?? "";
    });
    result.match({
      ok: (txHash) => {
        setResult({ kind: "claim", txHash });
        toast.success("Claimed");
        refetchOffer();
        refetchSubscription();
      },
      err: (err) => {
        toast.error("Claim failed", { description: getErrorMessage(err) });
      },
    });
    setSubmitting(false);
  }

  async function handleRefund() {
    if (!address) return;
    setSubmitting(true);
    const result = await Result.tryPromise(async () => {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.refund({ subscriber: address });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
      return sent.sendTransactionResponse?.hash ?? "";
    });
    result.match({
      ok: (txHash) => {
        setResult({ kind: "refund", txHash });
        toast.success("Refunded");
        refetchOffer();
        refetchSubscription();
      },
      err: (err) => {
        toast.error("Refund failed", { description: getErrorMessage(err) });
      },
    });
    setSubmitting(false);
  }

  const allotted =
    offer && subscription ? (subscription.shares * BigInt(offer.allotment_bps)) / 10_000n : 0n;

  return (
    <StepCard step={5} title="Allotment and claim" status={status}>
      {!hasSubscription && <p className="text-sm text-muted-foreground">Subscribe first.</p>}
      {hasSubscription && !subscription?.claimed && !result && (
        <div className="space-y-2">
          {!closed && (
            <p className="text-sm text-muted-foreground">
              Waiting for close
              {latestLedger && offer
                ? ` — ~${formatLedgerCountdown(offer.close_ledger - latestLedger)} left`
                : ""}
            </p>
          )}
          {closed && !offer?.finalized && !canRefund && (
            <p className="text-sm text-muted-foreground">Closed, waiting for finalize.</p>
          )}
          {offer?.finalized && <p className="text-sm">Allotment: {offer.allotment_bps / 100}%</p>}
          {canClaim && (
            <Button onClick={handleClaim} disabled={submitting}>
              {submitting ? "Claiming…" : "Claim"}
            </Button>
          )}
          {canRefund && (
            <Button onClick={handleRefund} disabled={submitting} variant="secondary">
              {submitting ? "Refunding…" : "Refund"}
            </Button>
          )}
        </div>
      )}
      {(result || subscription?.claimed) && (
        <div className="space-y-1 text-sm">
          <p>
            {result?.kind === "refund"
              ? "Refunded in full."
              : `Received ${(allotted / STROOP).toString()} DPRI.`}
          </p>
          {result?.txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="block text-muted-foreground underline underline-offset-2"
            >
              view transaction
            </a>
          )}
        </div>
      )}
    </StepCard>
  );
}
