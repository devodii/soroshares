import { createDiskStore } from "./disk-store";

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

const store = createDiskStore<KycRecord>("kyc");

export function getKyc(account: string): KycRecord | undefined {
  return store.get(account);
}

export function putKyc(account: string, record: KycRecord): void {
  store.set(account, record);
}
