"use client";

import { Asset, Operation } from "@stellar/stellar-sdk";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StepCard, StepStatus } from "@/components/step-card";
import { useAccount } from "@/hooks/use-account";
import { useWallet } from "@/hooks/use-wallet";
import { buildSignSubmit } from "@/lib/classic-tx";
import { DPRI_ISSUER } from "@/lib/env";
import { getErrorMessage } from "@/lib/error-message";

export function TrustlineStep() {
  const { address, signTransaction } = useWallet();
  const { data: account, refetch } = useAccount(address);
  const [submitting, setSubmitting] = React.useState(false);
  const [txHash, setTxHash] = React.useState<string | null>(null);

  const hasTrustline = account ? account.dpri !== "0" || account.dpriAuthorized : false;
  const status: StepStatus = !address ? "pending" : hasTrustline ? "done" : "active";

  async function handleAddTrustline() {
    if (!address) return;
    setSubmitting(true);
    try {
      const hash = await buildSignSubmit(
        address,
        [Operation.changeTrust({ asset: new Asset("DPRI", DPRI_ISSUER) })],
        signTransaction,
      );
      setTxHash(hash);
      toast.success("Trustline added");
      refetch();
    } catch (err) {
      toast.error("Add trustline failed", {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepCard step={2} title="Add DPRI trustline" status={status}>
      {!hasTrustline && (
        <Button onClick={handleAddTrustline} disabled={!address || submitting}>
          {submitting ? "Adding…" : "Add trustline"}
        </Button>
      )}
      {hasTrustline && <p className="text-sm text-muted-foreground">DPRI trustline is open.</p>}
      {txHash && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-muted-foreground underline underline-offset-2"
        >
          view transaction
        </a>
      )}
    </StepCard>
  );
}
