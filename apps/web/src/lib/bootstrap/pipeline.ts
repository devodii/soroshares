import {
  Asset,
  AuthClawbackEnabledFlag,
  AuthRequiredFlag,
  AuthRevocableFlag,
  Keypair,
  Operation,
  contract,
} from "@stellar/stellar-sdk";
import { clientEnv } from "@/lib/env.client";
import { serverEnv } from "@/lib/env.server";
import { horizonServer, rpcServer, submitWithKeypair } from "@/lib/stellar";
import { findTrustline } from "@/lib/trustline";
import { deployOfferContract, loadExistingOffer } from "./deploy-contract";
import { ensureFunded } from "./friendbot";
import { adminKeypair, issuerKeypair } from "./keys";
import { ensureStellarAssetContract } from "./sac";
import { BootstrapState, getBootstrapState, saveBootstrapState } from "./state";

const STROOP = 10_000_000n;
const LEDGERS_PER_DAY = 17_280; // ~5s per ledger
const CIRCLE_TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const DPRI_SUPPLY_WHOLE = "1000000";
const DPRI_SUPPLY_STROOPS = 1_000_000n * STROOP;
const PRICE_USDC_STROOPS = 3_900_000n;
const MIN_SHARES_STROOPS = 10n * STROOP;

/** The subset of the built-in Stellar Asset Contract's admin interface this pipeline calls. */
interface TokenAdminClient {
  authorized: (
    args: { id: string },
    options?: contract.MethodOptions,
  ) => Promise<contract.AssembledTransaction<boolean>>;
  set_authorized: (
    args: { id: string; authorize: boolean },
    options?: contract.MethodOptions,
  ) => Promise<contract.AssembledTransaction<null>>;
  balance: (
    args: { id: string },
    options?: contract.MethodOptions,
  ) => Promise<contract.AssembledTransaction<bigint>>;
}

export interface RunBootstrapOptions {
  closeWindowDays?: number;
  graceDays?: number;
  redeploy?: boolean;
}

export async function runBootstrap(options: RunBootstrapOptions = {}): Promise<BootstrapState> {
  const issuer = issuerKeypair();
  const admin = adminKeypair();
  const dpri = new Asset("DPRI", issuer.publicKey());

  await ensureFunded(issuer.publicKey());
  await ensureFunded(admin.publicKey());

  await ensureIssuerFlags(issuer);
  const dpriSac = await ensureStellarAssetContract(rpcServer, dpri, admin);

  const usdcIssuerKeypair = serverEnv.USE_MOCK_USDC
    ? Keypair.fromSecret(serverEnv.MOCK_USDC_ISSUER_SECRET)
    : admin;
  const usdcIssuerPublicKey = serverEnv.USE_MOCK_USDC
    ? usdcIssuerKeypair.publicKey()
    : CIRCLE_TESTNET_USDC_ISSUER;
  if (serverEnv.USE_MOCK_USDC) await ensureFunded(usdcIssuerPublicKey);
  const usdc = new Asset("USDC", usdcIssuerPublicKey);
  const usdcSac = await ensureStellarAssetContract(rpcServer, usdc, usdcIssuerKeypair);

  await ensureAdminTrustlines(issuer, admin, dpri, usdc);

  const cached = await getBootstrapState();
  let offerContract = cached?.offerContract;
  const closeWindowLedgers = (options.closeWindowDays ?? 30) * LEDGERS_PER_DAY;
  const graceLedgers = (options.graceDays ?? 7) * LEDGERS_PER_DAY;

  if (!offerContract || options.redeploy) {
    const latest = await rpcServer.getLatestLedger();
    const deployed = await deployOfferContract(rpcServer, {
      admin,
      usdcSac,
      dpriSac,
      price: PRICE_USDC_STROOPS,
      minShares: MIN_SHARES_STROOPS,
      closeLedger: latest.sequence + closeWindowLedgers,
      graceLedgers,
    });
    offerContract = deployed.contractId;
  }

  const offerClient = await loadExistingOffer(offerContract, admin);
  const offer = (await offerClient.get_offer()).result.unwrap();

  await ensureContractAuthorizedAndFunded(issuer, admin, dpriSac, offerContract, offerClient);

  const state: BootstrapState = {
    dpriIssuer: issuer.publicKey(),
    dpriSac,
    usdcIssuer: usdcIssuerPublicKey,
    usdcSac,
    offerContract,
    offerCloseLedger: offer.close_ledger,
    offerGraceLedgers: offer.grace_ledgers,
    adminPublic: admin.publicKey(),
    updatedAt: new Date().toISOString(),
  };
  await saveBootstrapState(state);
  return state;
}

async function ensureIssuerFlags(issuer: Keypair): Promise<void> {
  const account = await horizonServer.loadAccount(issuer.publicKey());
  if (
    account.flags.auth_required &&
    account.flags.auth_revocable &&
    account.flags.auth_clawback_enabled
  ) {
    return;
  }
  await submitWithKeypair(issuer, [
    Operation.setOptions({
      setFlags: AuthRequiredFlag | AuthRevocableFlag | AuthClawbackEnabledFlag,
    }),
  ]);
}

async function ensureAdminTrustlines(
  issuer: Keypair,
  admin: Keypair,
  dpri: Asset,
  usdc: Asset,
): Promise<void> {
  const account = await horizonServer.loadAccount(admin.publicKey());
  const dpriLine = findTrustline(account.balances, dpri);
  const usdcLine = findTrustline(account.balances, usdc);

  if (!dpriLine) await submitWithKeypair(admin, [Operation.changeTrust({ asset: dpri })]);
  if (!usdcLine) await submitWithKeypair(admin, [Operation.changeTrust({ asset: usdc })]);

  if (!dpriLine?.is_authorized) {
    await submitWithKeypair(issuer, [
      Operation.setTrustLineFlags({
        trustor: admin.publicKey(),
        asset: dpri,
        flags: { authorized: true },
      }),
    ]);
  }

  const adminDpriBalance = Number(dpriLine?.balance ?? "0");
  if (adminDpriBalance < Number(DPRI_SUPPLY_WHOLE)) {
    await submitWithKeypair(issuer, [
      Operation.payment({ destination: admin.publicKey(), asset: dpri, amount: DPRI_SUPPLY_WHOLE }),
    ]);
  }
}

async function ensureContractAuthorizedAndFunded(
  issuer: Keypair,
  admin: Keypair,
  dpriSac: string,
  offerContract: string,
  offerClient: Awaited<ReturnType<typeof loadExistingOffer>>,
): Promise<void> {
  const dpriTokenClient = await contract.Client.from<TokenAdminClient>({
    contractId: dpriSac,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
    publicKey: issuer.publicKey(),
    signTransaction: issuer,
  });

  const alreadyAuthorized = await dpriTokenClient
    .authorized({ id: offerContract })
    .then((tx) => tx.result === true)
    .catch(() => false);

  if (!alreadyAuthorized) {
    const authTx = await dpriTokenClient.set_authorized({ id: offerContract, authorize: true });
    await authTx.signAndSend();
  }

  const contractDpriBalance = await dpriTokenClient
    .balance({ id: offerContract })
    .then((tx) => tx.result)
    .catch(() => 0n);

  if (contractDpriBalance < DPRI_SUPPLY_STROOPS) {
    const depositTx = await offerClient.deposit_shares({
      admin: admin.publicKey(),
      amount: DPRI_SUPPLY_STROOPS,
    });
    (await depositTx.signAndSend()).result.unwrap();
  }
}
