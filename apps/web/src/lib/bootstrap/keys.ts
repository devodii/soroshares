import { Keypair } from "@stellar/stellar-sdk";
import { adminSecret, issuerSecret } from "@/lib/env";

export function issuerKeypair(): Keypair {
  return Keypair.fromSecret(issuerSecret());
}

export function adminKeypair(): Keypair {
  return Keypair.fromSecret(adminSecret());
}
