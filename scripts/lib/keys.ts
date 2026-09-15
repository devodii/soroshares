import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const KEYS_PATH = fileURLToPath(new URL("../.keys.json", import.meta.url));

export interface KeyEntry {
  publicKey: string;
  secretKey: string;
}

export type KeyStore = Record<string, KeyEntry | string>;

export function loadKeys(): KeyStore {
  if (!existsSync(KEYS_PATH)) return {};
  return JSON.parse(readFileSync(KEYS_PATH, "utf8"));
}

export function saveKeys(patch: KeyStore): void {
  const merged = { ...loadKeys(), ...patch };
  writeFileSync(KEYS_PATH, JSON.stringify(merged, null, 2) + "\n");
}
