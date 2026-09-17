"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepCard, StepStatus } from "@/components/step-card";
import { useAccount } from "@/hooks/use-account";
import { useKycStatus } from "@/hooks/use-kyc";
import { useLatestLedger } from "@/hooks/use-latest-ledger";
import { useOffer } from "@/hooks/use-offer";
import { useWallet } from "@/hooks/use-wallet";
import { getOfferClient } from "@/lib/contract";
import { MIN_SHARES, PRICE_NGN, PRICE_USDC } from "@/lib/env";
import { getErrorMessage } from "@/lib/error-message";
import { formatLedgerCountdown } from "@/lib/format-duration";

const STROOP = 10_000_000n;

export function SubscribeStep() {
  const { address, token, signTransaction, signAuthEntry } = useWallet();
  const { data: account, refetch: refetchAccount } = useAccount(address);
  const { data: kyc } = useKycStatus(token);
  const { data: offer, refetch: refetchOffer } = useOffer();
  const { data: latestLedger } = useLatestLedger();

  const [shares, setShares] = React.useState(10);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    txHash: string;
    shares: number;
    usdc: string;
  } | null>(null);

  const kycAccepted = kyc?.status === "ACCEPTED";
  const trustlineAuthorized = account?.dpriAuthorized ?? false;
  const offerClosed = Boolean(latestLedger && offer && latestLedger >= offer.close_ledger);
  const cost = shares * PRICE_USDC;
  const hasUsdcTrustline = account?.usdcTrustline ?? false;
  const insufficientUsdc = account ? Number(account.usdc) < cost : true;

  const canSubscribe =
    Boolean(address) &&
    kycAccepted &&
    trustlineAuthorized &&
    !offerClosed &&
    hasUsdcTrustline &&
    !insufficientUsdc &&
    shares >= 10;

  const status: StepStatus = !canSubscribe && !result ? "pending" : result ? "done" : "active";

  function disabledReason(): string | null {
    if (!address) return "Connect a wallet first";
    if (!kycAccepted) return "KYC not accepted";
    if (!trustlineAuthorized) return "Trustline not authorized";
    if (offerClosed) return "Offer closed";
    if (shares < 10) return "Minimum 10 shares";
    if (!hasUsdcTrustline) return "No USDC trustline";
    if (insufficientUsdc) return "Insufficient USDC";
    return null;
  }

  async function handleSubscribe() {
    if (!address) return;
    setSubmitting(true);
    try {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.subscribe({
        subscriber: address,
        shares: BigInt(shares) * STROOP,
      });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
      setResult({
        txHash: sent.sendTransactionResponse?.hash ?? "",
        shares,
        usdc: cost.toFixed(2),
      });
      toast.success(`Subscribed to ${shares} DPRI`);
      refetchAccount();
      refetchOffer();
    } catch (err) {
      toast.error("Subscribe failed", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const reason = disabledReason();

  return (
    <StepCard step={4} title="Subscribe" status={status}>
      {!result && (
        <div className="space-y-3">
          {latestLedger && offer && !offerClosed && (
            <p className="text-sm text-muted-foreground">
              Offer closes in ~{formatLedgerCountdown(offer.close_ledger - latestLedger)}
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="shares">Shares</Label>
            <Input
              id="shares"
              type="number"
              min={MIN_SHARES}
              step={10}
              value={shares}
              onChange={(e) => setShares(Number(e.target.value))}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            ₦{(shares * PRICE_NGN).toLocaleString()} / {cost.toFixed(2)} USDC
          </div>
          <div className="text-sm text-muted-foreground">Fee: 0</div>
          <div className="text-sm font-medium">Total: {cost.toFixed(2)} USDC</div>

          <Button
            type="button"
            className="w-full"
            onClick={handleSubscribe}
            disabled={!canSubscribe || submitting}
          >
            {submitting ? "Submitting…" : "Subscribe"}
          </Button>
          {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
        </div>
      )}
      {result && (
        <div className="space-y-1 text-sm">
          <p>
            You subscribed to {result.shares} DPRI. {result.usdc} USDC held in contract.
          </p>
          {result.txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="block text-muted-foreground underline underline-offset-2"
            >
              view transaction
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            If the offer closes without being finalized, you can refund in full after a grace
            period the contract enforces.
          </p>
        </div>
      )}
    </StepCard>
  );
}
