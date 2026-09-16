import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  BASE_FEE,
  contract,
  hash,
  Keypair,
  Operation,
  rpc,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, RPC_URL } from "./lib/config.js";
import { KeyEntry, loadKeys, saveKeys } from "./lib/keys.js";

const execFileAsync = promisify(execFile);
const rpcServer = new rpc.Server(RPC_URL);

const CONTRACT_DIR = fileURLToPath(new URL("../contracts/public_offer", import.meta.url));
const WASM_PATH = `${CONTRACT_DIR}/target/wasm32v1-none/release/public_offer.wasm`;

const LEDGERS_PER_DAY = 17_280; // ~5s per ledger
const CLOSE_WINDOW_LEDGERS = 30 * LEDGERS_PER_DAY; // offer stays open for 30 days
const GRACE_LEDGERS = 7 * LEDGERS_PER_DAY; // 7 days after close before refund() is permissionless
const PRICE_USDC_STROOPS = 3_900_000n;
const MIN_SHARES = 10n * 10_000_000n;

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
    throw new Error(`missing ${name} — run 02-issue-dpri.ts first`);
  }
  return entry;
}

async function ensureWasmInstalled(wasmBytes: Uint8Array, keypair: Keypair): Promise<Uint8Array> {
  const wasmHash = hash(wasmBytes);
  try {
    await rpcServer.getContractWasmByHash(wasmHash);
    console.log("wasm already installed on-chain");
    return wasmHash;
  } catch {
    // not found, upload below
  }

  console.log("uploading contract wasm");
  const account = await rpcServer.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
    .setTimeout(60)
    .build();
  const prepared = await rpcServer.prepareTransaction(tx);
  prepared.sign(keypair);
  const sent = await rpcServer.sendTransaction(prepared);
  const final = await rpcServer.pollTransaction(sent.hash, { attempts: 30 });
  if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`wasm upload failed: ${JSON.stringify(final)}`);
  }
  return wasmHash;
}

async function isAlreadyInitialized(client: contract.Client): Promise<boolean> {
  try {
    const tx = await (client as any).get_offer();
    return tx.result.isOk();
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const admin = requireKey("admin");
  const usdcSac = requireString("usdcSac");
  const dpriSac = requireString("dpriSac");
  const adminKeypair = Keypair.fromSecret(admin.secretKey);

  console.log("building contract");
  await execFileAsync("stellar", ["contract", "build"], { cwd: CONTRACT_DIR });

  const wasmBytes = readFileSync(WASM_PATH);
  const wasmHash = await ensureWasmInstalled(wasmBytes, adminKeypair);

  const existingContractId = loadKeys().offerContract;
  let client: contract.Client;
  if (typeof existingContractId === "string") {
    console.log(`reusing existing offer contract ${existingContractId}`);
    client = await contract.Client.from({
      contractId: existingContractId,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: admin.publicKey,
      signTransaction: adminKeypair,
    });
  } else {
    console.log("deploying public_offer contract");
    const deployTx = await contract.Client.deploy(null, {
      wasmHash,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: admin.publicKey,
      signTransaction: adminKeypair,
    });
    const sentDeploy = await deployTx.signAndSend();
    client = sentDeploy.result;
    saveKeys({ offerContract: client.options.contractId });
    console.log(`deployed offer contract ${client.options.contractId}`);
  }

  if (await isAlreadyInitialized(client)) {
    console.log("offer already initialized, skipping init");
  } else {
    const latestLedger = await rpcServer.getLatestLedger();
    const closeLedger = latestLedger.sequence + CLOSE_WINDOW_LEDGERS;

    console.log(`calling init (close_ledger=${closeLedger}, grace_ledgers=${GRACE_LEDGERS})`);
    const initTx = await (client as any).init({
      admin: admin.publicKey,
      usdc: usdcSac,
      share: dpriSac,
      price: PRICE_USDC_STROOPS,
      min_shares: MIN_SHARES,
      close_ledger: closeLedger,
      grace_ledgers: GRACE_LEDGERS,
    });
    const sentInit = await initTx.signAndSend();
    sentInit.result.unwrap();
    console.log("offer initialized");
    saveKeys({
      offerCloseLedger: String(closeLedger),
      offerGraceLedgers: String(GRACE_LEDGERS),
    });
  }

  saveKeys({ offerContract: client.options.contractId });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
