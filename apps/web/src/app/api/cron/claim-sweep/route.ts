import { Client } from "@soroshares/contract-client";
import { Keypair } from "@stellar/stellar-sdk";
import { apiHandler } from "@/lib/api-handler";
import { clientEnv } from "@/lib/env.client";
import { serverEnv } from "@/lib/env.server";
import { getErrorMessage } from "@/lib/error-message";
import { rpcServer } from "@/lib/stellar";
import { refreshSubscriberIndex } from "@/lib/subscriber-index";

export const maxDuration = 300;

type Action = "claim" | "refund";

// Every write here shares one admin source account, and Soroban transactions
// from a single account must use strictly sequential sequence numbers — so
// unlike the read checks below, these can't be parallelized with Promise.all.
function actionFor(offer: { finalized: boolean }, graceElapsed: boolean): Action | null {
  if (offer.finalized) return "claim";
  if (graceElapsed) return "refund";
  return null;
}

export const GET = apiHandler({
  auth: "cron",
  rateLimit: 5,
  handler: async () => {
    const admin = Keypair.fromSecret(serverEnv.ADMIN_SECRET);
    const client = new Client({
      contractId: clientEnv.NEXT_PUBLIC_OFFER_CONTRACT,
      networkPassphrase: clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE,
      rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
      publicKey: admin.publicKey(),
      signTransaction: admin,
    });

    const [offerTx, latest, subscribers] = await Promise.all([
      client.get_offer(),
      rpcServer.getLatestLedger(),
      refreshSubscriberIndex(),
    ]);
    const offer = offerTx.result.unwrap();
    const graceElapsed = latest.sequence >= offer.close_ledger + offer.grace_ledgers;
    const action = actionFor(offer, graceElapsed);

    const claimed: string[] = [];
    const refunded: string[] = [];
    let skipped = 0;
    const errors: { address: string; message: string }[] = [];

    if (!action) {
      return {
        subscribersIndexed: subscribers.length,
        claimed,
        refunded,
        skipped: subscribers.length,
        errors,
      };
    }

    const eligibility = await Promise.all(
      subscribers.map(async (address) => {
        const [hasClaimedTx, subscribedTx] = await Promise.all([
          client.has_claimed({ subscriber: address }),
          client.get_subscription({ subscriber: address }),
        ]);
        const eligible = !hasClaimedTx.result && subscribedTx.result > 0n;
        return { address, eligible };
      }),
    );

    for (const { address, eligible } of eligibility) {
      if (!eligible) {
        skipped += 1;
        continue;
      }
      try {
        const tx = await client[action]({ subscriber: address });
        (await tx.signAndSend()).result.unwrap();
        (action === "claim" ? claimed : refunded).push(address);
      } catch (err) {
        errors.push({ address, message: getErrorMessage(err) });
      }
    }

    return {
      subscribersIndexed: subscribers.length,
      claimed,
      refunded,
      skipped,
      errors,
    };
  },
});
