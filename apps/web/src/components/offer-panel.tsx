"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestLedger } from "@/hooks/use-latest-ledger";
import { useOffer } from "@/hooks/use-offer";
import { clientEnv } from "@/lib/env.client";

const STROOP = 10_000_000;

function offerStatus(
  finalized: boolean,
  closed: boolean,
): { label: string; variant: "default" | "secondary" | "outline" } {
  if (finalized) return { label: "Finalized", variant: "default" };
  if (closed) return { label: "Closed", variant: "secondary" };
  return { label: "Open", variant: "outline" };
}

export function OfferPanel() {
  const { data: offer, isLoading } = useOffer();
  const { data: latestLedger } = useLatestLedger();

  if (isLoading || !offer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const closed = Boolean(latestLedger && latestLedger >= offer.close_ledger);
  const status = offerStatus(offer.finalized, closed);
  const remainingLedgers = latestLedger ? Math.max(offer.close_ledger - latestLedger, 0) : null;
  const totalShares = Number(BigInt(offer.total_shares) / BigInt(STROOP));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Offer</CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row
          label="Price per share"
          value={`₦${clientEnv.NEXT_PUBLIC_PRICE_NGN} / ${clientEnv.NEXT_PUBLIC_PRICE_USDC} USDC`}
        />
        <Row label="Minimum shares" value="10" />
        <Row
          label="Close ledger"
          value={
            remainingLedgers === null
              ? String(offer.close_ledger)
              : closed
                ? `${offer.close_ledger} (closed)`
                : `${offer.close_ledger} (~${remainingLedgers * 5}s)`
          }
        />
        <Row label="Total subscribed" value={`${totalShares.toLocaleString()} shares`} />
        {offer.finalized && <Row label="Allotment" value={`${offer.allotment_bps / 100}%`} />}
        <Separator />
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${offer.contract}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-muted-foreground underline underline-offset-2"
        >
          {offer.contract}
        </a>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
