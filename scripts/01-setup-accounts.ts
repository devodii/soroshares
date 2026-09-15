import { Keypair } from "@stellar/stellar-sdk";
import { fund } from "./lib/friendbot.js";
import { horizon } from "./lib/horizon.js";
import { KeyEntry, loadKeys, saveKeys } from "./lib/keys.js";

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
