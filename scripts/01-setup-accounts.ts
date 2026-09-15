import { Horizon, Keypair } from "@stellar/stellar-sdk";
import { FRIENDBOT_URL, HORIZON_URL } from "./lib/config.js";
import { KeyEntry, loadKeys, saveKeys } from "./lib/keys.js";

const horizon = new Horizon.Server(HORIZON_URL);

async function fund(publicKey: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) {
    throw new Error(`friendbot funding failed for ${publicKey}: ${await res.text()}`);
  }
}

async function ensureAccount(name: string): Promise<KeyEntry> {
  const keys = loadKeys();
  const existing = keys[name];
  if (existing && typeof existing === "object") {
    await horizon.loadAccount(existing.publicKey);
    console.log(`${name}: reusing ${existing.publicKey}`);
    return existing;
  }

  const kp = Keypair.random();
  await fund(kp.publicKey());
  await horizon.loadAccount(kp.publicKey());
  const entry: KeyEntry = { publicKey: kp.publicKey(), secretKey: kp.secret() };
  saveKeys({ [name]: entry });
  console.log(`${name}: created and funded ${entry.publicKey}`);
  return entry;
}

async function main(): Promise<void> {
  await ensureAccount("issuer");
  await ensureAccount("distributor");
  await ensureAccount("admin");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
