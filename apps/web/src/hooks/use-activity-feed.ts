"use client";

import { scValToNative } from "@stellar/stellar-sdk";
import { useQuery } from "@tanstack/react-query";
import { clientEnv } from "@/lib/env.client";
import { rpcServer } from "@/lib/stellar";

export interface ActivityEvent {
  id: string;
  ledger: number;
  type: string;
  address?: string;
  detail: string;
  txHash: string;
}

const EVENT_WINDOW_LEDGERS = 6000;
const STROOP = 10_000_000;
const STROOP_FIELDS = new Set(["shares", "allotted", "refund_usdc", "amount"]);

function formatValue(key: string, val: unknown): string {
  if (STROOP_FIELDS.has(key) && (typeof val === "bigint" || typeof val === "number")) {
    return (Number(val) / STROOP).toString();
  }
  if (key === "allotment_bps" && typeof val === "number") {
    return `${val / 100}%`;
  }
  return String(val);
}

function describe(
  topics: unknown[],
  value: unknown,
): { type: string; address?: string; detail: string } {
  const type = typeof topics[0] === "string" ? topics[0] : "event";
  const address = typeof topics[1] === "string" && topics[1].startsWith("G") ? topics[1] : undefined;

  if (value && typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => `${key}=${formatValue(key, val)}`,
    );
    return { type, address, detail: parts.join(", ") };
  }
  return { type, address, detail: value !== undefined ? String(value) : "" };
}

async function fetchActivity(): Promise<ActivityEvent[]> {
  const latest = await rpcServer.getLatestLedger();
  const startLedger = Math.max(latest.sequence - EVENT_WINDOW_LEDGERS, 1);

  const response = await rpcServer.getEvents({
    filters: [{ contractIds: [clientEnv.NEXT_PUBLIC_OFFER_CONTRACT] }],
    startLedger,
    limit: 20,
  });

  return response.events
    .map((event) => {
      const topics = event.topic.map((t) => scValToNative(t));
      const value = scValToNative(event.value);
      const { type, address, detail } = describe(topics, value);
      return {
        id: event.id,
        ledger: event.ledger,
        type,
        address,
        detail,
        txHash: event.txHash,
      };
    })
    .reverse()
    .slice(0, 20);
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ["activity-feed"],
    queryFn: fetchActivity,
    refetchInterval: 5000,
  });
}
