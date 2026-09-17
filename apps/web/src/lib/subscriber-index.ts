import "server-only";
import { scValToNative } from "@stellar/stellar-sdk";
import { clientEnv } from "./env.client";
import { createRedisStore } from "./redis-store";
import { rpcServer } from "./stellar";

interface SubscriberRecord {
  firstSeenLedger: number;
}

interface ScanState {
  lastScannedLedger: number;
}

// Soroban RPC only retains ~120,960 ledgers (~7 days) of events. The offer
// runs for up to 30 days, so we persist discovered addresses in Redis and
// re-scan forward from the last scanned ledger on every sweep, well before
// any event ages out — a cold run falls back to the full lookback window.
//
// A single getEvents call with a wide startLedger silently returns fewer
// events (sometimes zero) than a narrower one covering the same range on
// this RPC endpoint — confirmed empirically, not documented. Scanning in
// small bounded chunks is what actually surfaces all events reliably.
const DISCOVERY_LOOKBACK_LEDGERS = 100_000;
const CHUNK_LEDGERS = 5_000;
const SCAN_STATE_KEY = "current";

const store = createRedisStore<SubscriberRecord>("subscribers");
const scanStateStore = createRedisStore<ScanState>("subscriber-scan-state");

async function discoverSubscriberAddresses(startLedger: number): Promise<Map<string, number>> {
  const latest = await rpcServer.getLatestLedger();
  const found = new Map<string, number>();

  let chunkStart = startLedger;
  while (chunkStart < latest.sequence) {
    const chunkEnd = Math.min(chunkStart + CHUNK_LEDGERS, latest.sequence);

    const response = await rpcServer.getEvents({
      filters: [{ contractIds: [clientEnv.NEXT_PUBLIC_OFFER_CONTRACT] }],
      startLedger: chunkStart,
      limit: 1000,
    });

    for (const event of response.events) {
      if (event.ledger >= chunkEnd) continue;
      const topics = event.topic.map((t) => scValToNative(t));
      if (topics[0] !== "subscribe_event") continue;
      const address = topics[1];
      if (typeof address !== "string" || !address.startsWith("G")) continue;
      const existingLedger = found.get(address);
      if (existingLedger === undefined || event.ledger < existingLedger) {
        found.set(address, event.ledger);
      }
    }

    chunkStart = chunkEnd;
  }

  return found;
}

export async function refreshSubscriberIndex(): Promise<string[]> {
  const latest = await rpcServer.getLatestLedger();
  const scanState = await scanStateStore.get(SCAN_STATE_KEY);
  const retentionFloor = latest.sequence - DISCOVERY_LOOKBACK_LEDGERS;
  const startLedger = Math.max(scanState?.lastScannedLedger ?? 0, retentionFloor, 1);

  const discovered = await discoverSubscriberAddresses(startLedger);
  const existing = await store.all();

  for (const [address, ledger] of discovered) {
    if (!existing[address]) {
      await store.set(address, { firstSeenLedger: ledger });
    }
  }

  await scanStateStore.set(SCAN_STATE_KEY, { lastScannedLedger: latest.sequence });

  const merged = await store.all();
  return Object.keys(merged);
}
