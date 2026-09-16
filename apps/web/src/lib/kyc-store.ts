import { createRedisStore } from "./redis-store";

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

const store = createRedisStore<KycRecord>("kyc");

export function getKyc(account: string): Promise<KycRecord | undefined> {
  return store.get(account);
}

export function putKyc(account: string, record: KycRecord): Promise<void> {
  return store.set(account, record);
}
