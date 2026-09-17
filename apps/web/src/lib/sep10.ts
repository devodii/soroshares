import { Keypair, WebAuth } from "@stellar/stellar-sdk";
import { Result } from "better-result";
import { clientEnv } from "./env.client";
import { serverEnv } from "./env.server";

const CHALLENGE_TIMEOUT_SECONDS = 300;

export function buildChallenge(clientAccountId: string): Result<string, Error> {
  return Result.try({
    try: () => {
      const serverKeypair = Keypair.fromSecret(serverEnv.SERVER_SIGNING_SECRET);
      return WebAuth.buildChallengeTx(
        serverKeypair,
        clientAccountId,
        clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
        CHALLENGE_TIMEOUT_SECONDS,
        clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
        clientEnv.NEXT_PUBLIC_HOME_DOMAIN,
      );
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
  });
}

export function verifyChallenge(challengeXdr: string): Result<string, Error> {
  return Result.try({
    try: () => {
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
    },
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
  });
}
