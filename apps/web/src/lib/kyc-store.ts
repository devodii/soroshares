import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type KycStatus = "ACCEPTED" | "REJECTED" | "NEEDS_INFO";

export interface KycRecord {
  id: string;
  status: KycStatus;
  message?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  address_country_code: string;
  bank_account_number: string;
  email_address: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "kyc.json");

const memory = new Map<string, KycRecord>();
let loadedFromDisk = false;

function loadFromDisk(): void {
  if (loadedFromDisk) return;
  loadedFromDisk = true;
  if (!existsSync(DATA_FILE)) return;
  const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Record<string, KycRecord>;
  for (const [account, record] of Object.entries(raw)) {
    memory.set(account, record);
  }
}

function persistToDisk(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const asObject = Object.fromEntries(memory);
  writeFileSync(DATA_FILE, JSON.stringify(asObject, null, 2));
}

export function getKyc(account: string): KycRecord | undefined {
  loadFromDisk();
  return memory.get(account);
}

export function putKyc(account: string, record: KycRecord): void {
  loadFromDisk();
  memory.set(account, record);
  persistToDisk();
}
