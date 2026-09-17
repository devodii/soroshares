"use client";

import * as React from "react";
import { SECONDS_PER_LEDGER } from "@/lib/format-duration";

interface Anchor {
  ledgerDiff: number;
  capturedAt: number;
}

export function useCountdown(
  targetLedger: number | undefined,
  currentLedger: number | undefined,
): number {
  const [anchor, setAnchor] = React.useState<Anchor | null>(null);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (targetLedger === undefined || currentLedger === undefined) return;
    const capturedAt = Date.now();
    // Syncing a wall-clock anchor to a freshly polled ledger value is the side
    // effect itself, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchor({ ledgerDiff: targetLedger - currentLedger, capturedAt });
    setNow(capturedAt);
  }, [targetLedger, currentLedger]);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!anchor || now === null) return 0;
  const elapsedSinceAnchor = now - anchor.capturedAt;
  const remainingMs = anchor.ledgerDiff * SECONDS_PER_LEDGER * 1000 - elapsedSinceAnchor;
  return Math.max(remainingMs, 0);
}
