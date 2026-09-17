import { Keypair } from "@stellar/stellar-sdk";
import { serverEnv } from "@/lib/env.server";

export function issuerKeypair(): Keypair {
  return Keypair.fromSecret(serverEnv.ISSUER_SECRET);
}

export function adminKeypair(): Keypair {
  return Keypair.fromSecret(serverEnv.ADMIN_SECRET);
}
