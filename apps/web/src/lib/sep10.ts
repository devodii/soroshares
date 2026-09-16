import { Keypair, WebAuth } from "@stellar/stellar-sdk";
import { HOME_DOMAIN, NETWORK_PASSPHRASE, serverSigningSecret } from "./env";

const CHALLENGE_TIMEOUT_SECONDS = 300;

export function buildChallenge(clientAccountId: string): string {
  const serverKeypair = Keypair.fromSecret(serverSigningSecret());
  return WebAuth.buildChallengeTx(
    serverKeypair,
    clientAccountId,
    HOME_DOMAIN,
    CHALLENGE_TIMEOUT_SECONDS,
    NETWORK_PASSPHRASE,
    HOME_DOMAIN,
  );
}

export function verifyChallenge(challengeXdr: string): string {
  const serverPublicKey = Keypair.fromSecret(serverSigningSecret()).publicKey();
  const { clientAccountID } = WebAuth.readChallengeTx(
    challengeXdr,
    serverPublicKey,
    NETWORK_PASSPHRASE,
    HOME_DOMAIN,
    HOME_DOMAIN,
  );
  WebAuth.verifyChallengeTxSigners(
    challengeXdr,
    serverPublicKey,
    NETWORK_PASSPHRASE,
    [clientAccountID],
    HOME_DOMAIN,
    HOME_DOMAIN,
  );
  return clientAccountID;
}
