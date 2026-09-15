import { Asset, contract, Keypair, Operation } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, RPC_URL } from "./lib/config.js";
import { horizon, submit } from "./lib/horizon.js";
import { KeyEntry, loadKeys } from "./lib/keys.js";
import { findTrustline } from "./lib/trustline.js";

const DEPOSIT_SHARES_WHOLE = "1000000";
const DEPOSIT_SHARES_STROOPS = 1_000_000n * 10_000_000n;

function requireKey(name: string): KeyEntry {
  const entry = loadKeys()[name];
  if (!entry || typeof entry !== "object") {
    throw new Error(`missing ${name} — run 01-setup-accounts.ts first`);
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

async function main(): Promise<void> {
  const issuer = requireKey("issuer");
  const distributor = requireKey("distributor");
  const admin = requireKey("admin");
  const dpriSac = requireString("dpriSac");
  const offerContract = requireString("offerContract");
  const dpri = new Asset("DPRI", issuer.publicKey);

  const dpriClient = await contract.Client.from({
    contractId: dpriSac,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: issuer.publicKey,
    signTransaction: Keypair.fromSecret(issuer.secretKey),
  });

  // The contract's own DPRI balance is the single source of truth for whether
  // the deposit already happened — admin's classic balance passes straight
  // through to the contract in the same run, so it can't be used to tell.
  const contractDpriBalance = await (async () => {
    try {
      const tx = await (dpriClient as any).balance({ id: offerContract });
      return BigInt(tx.result);
    } catch {
      return 0n;
    }
  })();

  if (contractDpriBalance >= DEPOSIT_SHARES_STROOPS) {
    console.log(`contract already holds ${contractDpriBalance} DPRI stroops, nothing to do`);
    return;
  }

  const adminAccount = await horizon.loadAccount(admin.publicKey);
  const adminTrustline = findTrustline(adminAccount.balances, dpri);

  if (adminTrustline) {
    console.log("admin DPRI trustline already open, skipping");
  } else {
    console.log("admin opening DPRI trustline");
    await submit(admin.secretKey, [Operation.changeTrust({ asset: dpri })]);
  }

  if (adminTrustline?.is_authorized) {
    console.log("admin DPRI trustline already authorized, skipping");
  } else {
    console.log("issuer authorizing admin's DPRI trustline");
    await submit(issuer.secretKey, [
      Operation.setTrustLineFlags({
        trustor: admin.publicKey,
        asset: dpri,
        flags: { authorized: true },
      }),
    ]);
  }

  if (adminTrustline && Number(adminTrustline.balance) >= Number(DEPOSIT_SHARES_WHOLE)) {
    console.log(`admin already holds ${adminTrustline.balance} DPRI, skipping distributor payment`);
  } else {
    console.log(`distributor paying ${DEPOSIT_SHARES_WHOLE} DPRI to admin`);
    await submit(distributor.secretKey, [
      Operation.payment({ destination: admin.publicKey, asset: dpri, amount: DEPOSIT_SHARES_WHOLE }),
    ]);
  }

  const contractAuthorized = await (async () => {
    try {
      const tx = await (dpriClient as any).authorized({ id: offerContract });
      return tx.result === true;
    } catch {
      return false;
    }
  })();

  if (contractAuthorized) {
    console.log("contract DPRI balance already authorized, skipping");
  } else {
    console.log("issuer authorizing contract to hold DPRI");
    const authTx = await (dpriClient as any).set_authorized({ id: offerContract, authorize: true });
    await authTx.signAndSend();
  }

  const offerClient = await contract.Client.from({
    contractId: offerContract,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: admin.publicKey,
    signTransaction: Keypair.fromSecret(admin.secretKey),
  });

  console.log(`depositing ${DEPOSIT_SHARES_STROOPS} DPRI stroops into offer contract`);
  const depositTx = await (offerClient as any).deposit_shares({
    admin: admin.publicKey,
    amount: DEPOSIT_SHARES_STROOPS,
  });
  const sent = await depositTx.signAndSend();
  sent.result.unwrap();
  console.log("shares deposited");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
