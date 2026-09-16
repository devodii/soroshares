import { createDiskStore } from "@/lib/disk-store";

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

const store = createDiskStore<BootstrapState>("bootstrap");
const KEY = "current";

export function getBootstrapState(): BootstrapState | undefined {
  return store.get(KEY);
}

export function saveBootstrapState(state: BootstrapState): void {
  store.set(KEY, state);
}
