import { BASE_FEE, Keypair, Operation, TransactionBuilder, hash, rpc } from "@stellar/stellar-sdk";
import { Client as OfferClient } from "@soroshares/contract-client";
import { clientEnv } from "@/lib/env.client";
import { publicOfferWasm } from "./wasm";

async function ensureWasmInstalled(rpcServer: rpc.Server, keypair: Keypair): Promise<Uint8Array> {
  const wasmBytes = publicOfferWasm();
  const wasmHash = hash(wasmBytes);

  try {
    await rpcServer.getContractWasmByHash(wasmHash);
    return wasmHash;
  } catch {}

  const account = await rpcServer.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
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

export interface DeployOfferParams {
  admin: Keypair;
  usdcSac: string;
  dpriSac: string;
  price: bigint;
  minShares: bigint;
  closeLedger: number;
  graceLedgers: number;
}

export async function deployOfferContract(
  rpcServer: rpc.Server,
  params: DeployOfferParams,
): Promise<{ contractId: string }> {
  const wasmHash = await ensureWasmInstalled(rpcServer, params.admin);

  const deployTx = await OfferClient.deploy({
    wasmHash: Buffer.from(wasmHash),
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
    publicKey: params.admin.publicKey(),
    signTransaction: params.admin,
  });
  const sentDeploy = await deployTx.signAndSend();
  const client = sentDeploy.result;

  const initTx = await client.init({
    admin: params.admin.publicKey(),
    usdc: params.usdcSac,
    share: params.dpriSac,
    price: params.price,
    min_shares: params.minShares,
    close_ledger: params.closeLedger,
    grace_ledgers: params.graceLedgers,
  });
  (await initTx.signAndSend()).result.unwrap();

  return { contractId: client.options.contractId };
}

export async function loadExistingOffer(contractId: string, admin: Keypair): Promise<OfferClient> {
  return OfferClient.from({
    contractId,
    networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
    publicKey: admin.publicKey(),
    signTransaction: admin,
  });
}
