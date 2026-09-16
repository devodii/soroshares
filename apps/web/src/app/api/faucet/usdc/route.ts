import { Asset, Keypair, Operation } from "@stellar/stellar-sdk";
import { z } from "zod";
import { ApiError, apiHandler } from "@/lib/api-handler";
import { USDC_ISSUER, USE_MOCK_USDC, mockUsdcIssuerSecret } from "@/lib/env";
import { horizonServer, submitWithKeypair } from "@/lib/stellar";
import { findTrustline } from "@/lib/trustline";

const FAUCET_AMOUNT = "1000";
const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

const faucetBody = z.object({
  address: z.string().regex(STELLAR_ACCOUNT, "invalid Stellar account id"),
});

export const POST = apiHandler({
  rateLimit: 10,
  schema: { body: faucetBody },
  handler: async ({ body }) => {
    if (!USE_MOCK_USDC) {
      throw new ApiError(
        400,
        "NOT_MOCK_USDC",
        "this deployment uses real testnet USDC — get it from faucet.circle.com instead",
      );
    }

    const usdc = new Asset("USDC", USDC_ISSUER);
    const account = await horizonServer.loadAccount(body.address);
    if (!findTrustline(account.balances, usdc)) {
      throw new ApiError(400, "NO_TRUSTLINE", "add a USDC trustline before requesting test USDC");
    }

    await submitWithKeypair(Keypair.fromSecret(mockUsdcIssuerSecret()), [
      Operation.payment({ destination: body.address, asset: usdc, amount: FAUCET_AMOUNT }),
    ]);

    return { amount: FAUCET_AMOUNT };
  },
});
