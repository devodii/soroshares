import { z } from "zod";
import { ApiError, apiHandler } from "@/lib/api-handler";
import { NETWORK_PASSPHRASE } from "@/lib/env";
import { issueToken } from "@/lib/jwt";
import { buildChallenge, verifyChallenge } from "@/lib/sep10";

const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

const challengeQuery = z.object({
  account: z.string().regex(STELLAR_ACCOUNT, "invalid Stellar account id"),
});

export const GET = apiHandler({
  schema: { query: challengeQuery },
  handler: async ({ query }) => {
    try {
      const transaction = buildChallenge(query.account);
      return { transaction, network_passphrase: NETWORK_PASSPHRASE };
    } catch (err) {
      throw new ApiError(400, "CHALLENGE_FAILED", err instanceof Error ? err.message : String(err));
    }
  },
});

const verifyBody = z.object({ transaction: z.string().min(1) });

export const POST = apiHandler({
  schema: { body: verifyBody },
  handler: async ({ body }) => {
    try {
      const account = verifyChallenge(body.transaction);
      const token = await issueToken(account);
      return { token };
    } catch (err) {
      throw new ApiError(400, "VERIFICATION_FAILED", err instanceof Error ? err.message : String(err));
    }
  },
});
