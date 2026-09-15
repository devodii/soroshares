import { randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE, RPC_URL } from "./lib/config.js";
import { KeyEntry, loadKeys, saveKeys } from "./lib/keys.js";

function requireKey(name: string): KeyEntry {
  const entry = loadKeys()[name];
  if (!entry || typeof entry !== "object") {
    throw new Error(
      `missing ${name} — run 01-setup-accounts.ts through 04-fund-contract-shares.ts first`,
    );
  }
  return entry;
}

function requireString(name: string): string {
  const entry = loadKeys()[name];
  if (typeof entry !== "string") {
    throw new Error(`missing ${name} — run 02-issue-dpri.ts and 03-deploy-contract.ts first`);
  }
  return entry;
}

function ensureServerSigning(): KeyEntry {
  const existing = loadKeys().serverSigning;
  if (existing && typeof existing === "object") return existing;
  const kp = Keypair.random();
  const entry: KeyEntry = { publicKey: kp.publicKey(), secretKey: kp.secret() };
  saveKeys({ serverSigning: entry });
  return entry;
}

function ensureSecret(name: string): string {
  const existing = loadKeys()[name];
  if (typeof existing === "string") return existing;
  const value = randomBytes(32).toString("hex");
  saveKeys({ [name]: value });
  return value;
}

function main(): void {
  const issuer = requireKey("issuer");
  const admin = requireKey("admin");
  const dpriSac = requireString("dpriSac");
  const usdcIssuer = requireString("usdcIssuer");
  const usdcSac = requireString("usdcSac");
  const offerContract = requireString("offerContract");
  const closeLedger = requireString("offerCloseLedger");
  const serverSigning = ensureServerSigning();
  const jwtSecret = ensureSecret("jwtSecret");
  const adminUiPassword = ensureSecret("adminUiPassword");

  const lines = [
    `NEXT_PUBLIC_NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"`,
    `NEXT_PUBLIC_HORIZON_URL=${HORIZON_URL}`,
    `NEXT_PUBLIC_RPC_URL=${RPC_URL}`,
    `NEXT_PUBLIC_HOME_DOMAIN=localhost:3000`,
    `NEXT_PUBLIC_DPRI_ISSUER=${issuer.publicKey}`,
    `NEXT_PUBLIC_DPRI_SAC=${dpriSac}`,
    `NEXT_PUBLIC_USDC_ISSUER=${usdcIssuer}`,
    `NEXT_PUBLIC_USDC_SAC=${usdcSac}`,
    `NEXT_PUBLIC_OFFER_CONTRACT=${offerContract}`,
    `NEXT_PUBLIC_ADMIN_PUBLIC=${admin.publicKey}`,
    `NEXT_PUBLIC_DEMO_CLOSE_LEDGER=${closeLedger}`,
    `NEXT_PUBLIC_PRICE_NGN=525`,
    `NEXT_PUBLIC_PRICE_USDC=0.39`,
    `NEXT_PUBLIC_MIN_SHARES=10`,
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=`,
    `# server only`,
    `ISSUER_SECRET=${issuer.secretKey}`,
    `SERVER_SIGNING_SECRET=${serverSigning.secretKey}`,
    `JWT_SECRET=${jwtSecret}`,
    `ADMIN_UI_PASSWORD=${adminUiPassword}`,
    `USE_MOCK_USDC=${loadKeys().useMockUsdc ?? "false"}`,
  ];

  console.log(lines.join("\n"));
}

main();
