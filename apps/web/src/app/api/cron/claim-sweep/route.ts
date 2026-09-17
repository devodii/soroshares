import { Client } from "@soroshares/contract-client";
import { Keypair } from "@stellar/stellar-sdk";
import { apiHandler } from "@/lib/api-handler";
import { clientEnv } from "@/lib/env.client";
import { serverEnv } from "@/lib/env.server";
import { getErrorMessage } from "@/lib/error-message";
import { rpcServer } from "@/lib/stellar";
import { refreshSubscriberIndex } from "@/lib/subscriber-index";

export const maxDuration = 300;

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

    const claimed: string[] = [];
    const refunded: string[] = [];
    let skipped = 0;
    const errors: { address: string; message: string }[] = [];

    for (const address of subscribers) {
      try {
        const hasClaimedTx = await client.has_claimed({ subscriber: address });
        if (hasClaimedTx.result) {
          skipped += 1;
          continue;
        }
        const subscribedTx = await client.get_subscription({ subscriber: address });
        if (subscribedTx.result === 0n) {
          skipped += 1;
          continue;
        }

        if (offer.finalized) {
          const tx = await client.claim({ subscriber: address });
          (await tx.signAndSend()).result.unwrap();
          claimed.push(address);
        } else if (graceElapsed) {
          const tx = await client.refund({ subscriber: address });
          (await tx.signAndSend()).result.unwrap();
          refunded.push(address);
        } else {
          skipped += 1;
        }
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
