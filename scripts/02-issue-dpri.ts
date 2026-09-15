import {
  Asset,
  AuthClawbackEnabledFlag,
  AuthRequiredFlag,
  AuthRevocableFlag,
  Keypair,
  Operation,
} from "@stellar/stellar-sdk";
import { deployStellarAssetContract } from "./lib/cli.js";
import { fund } from "./lib/friendbot.js";
import { horizon, submit } from "./lib/horizon.js";
import { KeyEntry, loadKeys, saveKeys } from "./lib/keys.js";
import { findTrustline } from "./lib/trustline.js";

const DPRI_SUPPLY = "1000000";
const USDC_TESTNET_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function requireKey(name: string): KeyEntry {
  const entry = loadKeys()[name];
  if (!entry || typeof entry !== "object") {
    throw new Error(`missing ${name} key — run 01-setup-accounts.ts first`);
  }
  return entry;
}

async function ensureMockUsdcIssuer(): Promise<KeyEntry> {
  const existing = loadKeys().mockUsdcIssuer;
  if (existing && typeof existing === "object") return existing;

  const kp = Keypair.random();
  await fund(kp.publicKey());
  const entry: KeyEntry = { publicKey: kp.publicKey(), secretKey: kp.secret() };
  saveKeys({ mockUsdcIssuer: entry });
  return entry;
}

async function main(): Promise<void> {
  const issuer = requireKey("issuer");
  const distributor = requireKey("distributor");
  const admin = requireKey("admin");
  const dpri = new Asset("DPRI", issuer.publicKey);

  const issuerAccount = await horizon.loadAccount(issuer.publicKey);
  const flags = issuerAccount.flags;
  if (flags.auth_required && flags.auth_revocable && flags.auth_clawback_enabled) {
    console.log("issuer flags already set, skipping");
  } else {
    console.log("setting issuer flags: AUTH_REQUIRED | AUTH_REVOCABLE | AUTH_CLAWBACK_ENABLED");
    await submit(issuer.secretKey, [
      Operation.setOptions({
        setFlags: AuthRequiredFlag | AuthRevocableFlag | AuthClawbackEnabledFlag,
      }),
    ]);
  }

  const distributorAccount = await horizon.loadAccount(distributor.publicKey);
  const distributorTrustline = findTrustline(distributorAccount.balances, dpri);
  if (distributorTrustline) {
    console.log("distributor DPRI trustline already open, skipping");
  } else {
    console.log("distributor opening DPRI trustline");
    await submit(distributor.secretKey, [Operation.changeTrust({ asset: dpri })]);
  }

  if (distributorTrustline?.is_authorized) {
    console.log("distributor DPRI trustline already authorized, skipping");
  } else {
    console.log("issuer authorizing distributor's DPRI trustline");
    await submit(issuer.secretKey, [
      Operation.setTrustLineFlags({
        trustor: distributor.publicKey,
        asset: dpri,
        flags: { authorized: true },
      }),
    ]);
  }

  if (distributorTrustline && Number(distributorTrustline.balance) >= Number(DPRI_SUPPLY)) {
    console.log(`distributor already holds ${distributorTrustline.balance} DPRI, skipping payment`);
  } else {
    console.log(`issuer paying ${DPRI_SUPPLY} DPRI to distributor`);
    await submit(issuer.secretKey, [
      Operation.payment({ destination: distributor.publicKey, asset: dpri, amount: DPRI_SUPPLY }),
    ]);
  }

  console.log("deploying DPRI Stellar Asset Contract");
  const dpriSac = await deployStellarAssetContract("DPRI", issuer.publicKey, admin.secretKey);
  console.log(`DPRI SAC: ${dpriSac}`);

  const useMockUsdc = process.env.USE_MOCK_USDC === "true";
  const usdcIssuerPublicKey = useMockUsdc
    ? (await ensureMockUsdcIssuer()).publicKey
    : USDC_TESTNET_ISSUER;
  console.log(
    useMockUsdc
      ? `USE_MOCK_USDC=true, using mock USDC issuer ${usdcIssuerPublicKey}`
      : `using Circle testnet USDC issuer ${usdcIssuerPublicKey}`,
  );

  console.log("deploying USDC Stellar Asset Contract");
  const usdcSac = await deployStellarAssetContract("USDC", usdcIssuerPublicKey, admin.secretKey);
  console.log(`USDC SAC: ${usdcSac}`);

  saveKeys({
    dpriIssuer: issuer.publicKey,
    dpriSac,
    usdcIssuer: usdcIssuerPublicKey,
    usdcSac,
    useMockUsdc: String(useMockUsdc),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
