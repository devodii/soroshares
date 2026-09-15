import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Asset } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "./config.js";

const execFileAsync = promisify(execFile);

/**
 * SAC addresses are deterministic (derived from network id + asset), so a
 * widely-used testnet asset like Circle's USDC is often already wrapped by
 * someone else. Deploy and fall back to the computed id if it already exists.
 */
export async function deployStellarAssetContract(
  assetCode: string,
  issuerPublicKey: string,
  sourceSecret: string,
): Promise<string> {
  const expectedId = new Asset(assetCode, issuerPublicKey).contractId(NETWORK_PASSPHRASE);
  try {
    const { stdout } = await execFileAsync("stellar", [
      "contract",
      "asset",
      "deploy",
      "--asset",
      `${assetCode}:${issuerPublicKey}`,
      "--source-account",
      sourceSecret,
      "--network",
      "testnet",
    ]);
    return stdout.trim() || expectedId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ExistingValue") || message.includes("already exists")) {
      return expectedId;
    }
    throw err;
  }
}
