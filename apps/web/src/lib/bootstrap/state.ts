import { createRedisStore } from "@/lib/redis-store";

export interface BootstrapState {
  dpriIssuer: string;
  dpriSac: string;
  usdcIssuer: string;
  usdcSac: string;
  offerContract: string;
  offerCloseLedger: number;
  offerGraceLedgers: number;
  adminPublic: string;
  updatedAt: string;
}

const store = createRedisStore<BootstrapState>("bootstrap");
const KEY = "current";

export function getBootstrapState(): Promise<BootstrapState | undefined> {
  return store.get(KEY);
}

export function saveBootstrapState(state: BootstrapState): Promise<void> {
  return store.set(KEY, state);
}
