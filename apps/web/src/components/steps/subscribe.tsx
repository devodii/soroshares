"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Result } from "better-result";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { clientEnv } from "@/lib/env.client";
import { getErrorMessage } from "@/lib/error-message";
import { formatLedgerCountdown } from "@/lib/format-duration";

const STROOP = 10_000_000n;

const subscribeSchema = z.object({
  shares: z
    .number()
    .int()
    .min(clientEnv.NEXT_PUBLIC_MIN_SHARES, `Minimum ${clientEnv.NEXT_PUBLIC_MIN_SHARES} shares`),
});

type SubscribeFormValues = z.infer<typeof subscribeSchema>;

export function SubscribeStep() {
  const { address, token, signTransaction, signAuthEntry } = useWallet();
  const { data: account, refetch: refetchAccount } = useAccount(address);
  const { data: kyc } = useKycStatus(token);
  const { data: offer, refetch: refetchOffer } = useOffer();
  const { data: latestLedger } = useLatestLedger();

  const form = useForm<SubscribeFormValues>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { shares: clientEnv.NEXT_PUBLIC_MIN_SHARES },
  });
  const shares = useWatch({ control: form.control, name: "shares" }) || 0;

  const [result, setResult] = React.useState<{
    txHash: string;
    shares: number;
    usdc: string;
  } | null>(null);

  const kycAccepted = kyc?.status === "ACCEPTED";
  const trustlineAuthorized = account?.dpriAuthorized ?? false;
  const offerClosed = Boolean(latestLedger && offer && latestLedger >= offer.close_ledger);
  const cost = shares * clientEnv.NEXT_PUBLIC_PRICE_USDC;
  const hasUsdcTrustline = account?.usdcTrustline ?? false;
  const insufficientUsdc = account ? Number(account.usdc) < cost : true;

  const canSubscribe =
    Boolean(address) &&
    kycAccepted &&
    trustlineAuthorized &&
    !offerClosed &&
    hasUsdcTrustline &&
    !insufficientUsdc;

  const status: StepStatus = !canSubscribe && !result ? "pending" : result ? "done" : "active";

  function disabledReason(): string | null {
    if (!address) return "Connect a wallet first";
    if (!kycAccepted) return "KYC not accepted";
    if (!trustlineAuthorized) return "Trustline not authorized";
    if (offerClosed) return "Offer closed";
    if (!hasUsdcTrustline) return "No USDC trustline";
    if (insufficientUsdc) return "Insufficient USDC";
    return null;
  }

  async function onSubmit(values: SubscribeFormValues) {
    if (!address) return;
    const result = await Result.tryPromise(async () => {
      const client = getOfferClient(address, signTransaction, signAuthEntry);
      const tx = await client.subscribe({
        subscriber: address,
        shares: BigInt(values.shares) * STROOP,
      });
      const sent = await tx.signAndSend();
      sent.result.unwrap();
      return sent.sendTransactionResponse?.hash ?? "";
    });
    result.match({
      ok: (txHash) => {
        setResult({ txHash, shares: values.shares, usdc: cost.toFixed(2) });
        toast.success(`Subscribed to ${values.shares} DPRI`);
        refetchAccount();
        refetchOffer();
      },
      err: (err) => {
        toast.error("Subscribe failed", { description: getErrorMessage(err) });
      },
    });
  }

  const reason = disabledReason();

  return (
    <StepCard step={4} title="Subscribe" status={status}>
      {!result && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
              min={clientEnv.NEXT_PUBLIC_MIN_SHARES}
              step={10}
              {...form.register("shares", { valueAsNumber: true })}
            />
            {form.formState.errors.shares && (
              <p className="text-xs text-destructive">{form.formState.errors.shares.message}</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            ₦{(shares * clientEnv.NEXT_PUBLIC_PRICE_NGN).toLocaleString()} / {cost.toFixed(2)} USDC
          </div>
          <div className="text-sm text-muted-foreground">Fee: 0</div>
          <div className="text-sm font-medium">Total: {cost.toFixed(2)} USDC</div>

          <Button
            type="submit"
            className="w-full"
            disabled={!canSubscribe || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Submitting…" : "Subscribe"}
          </Button>
          {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
        </form>
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
