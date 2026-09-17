import { Keypair, WebAuth } from "@stellar/stellar-sdk";
import { clientEnv } from "./env.client";
import { serverEnv } from "./env.server";

const CHALLENGE_TIMEOUT_SECONDS = 300;

export function buildChallenge(clientAccountId: string): string {
  const serverKeypair = Keypair.fromSecret(serverEnv.SERVER_SIGNING_SECRET);
  return WebAuth.buildChallengeTx(
    serverKeypair,
    clientAccountId,
    clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
    CHALLENGE_TIMEOUT_SECONDS,
    clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
  );
}

export function verifyChallenge(challengeXdr: string): string {
  const serverPublicKey = Keypair.fromSecret(serverEnv.SERVER_SIGNING_SECRET).publicKey();
  const { clientAccountID } = WebAuth.readChallengeTx(
    challengeXdr,
    serverPublicKey,
    clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
    clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
  );
  WebAuth.verifyChallengeTxSigners(
    challengeXdr,
    serverPublicKey,
    clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
    [clientAccountID],
    clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
    clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
  );
  return clientAccountID;
}
