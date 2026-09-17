import {
  Asset,
  BASE_FEE,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { z } from "zod";
import { ApiError, apiHandler } from "@/lib/api-handler";
import { NETWORK_PASSPHRASE, USDC_ISSUER, USE_MOCK_USDC, mockUsdcIssuerSecret } from "@/lib/env";
import { FAUCET_AMOUNT } from "@/lib/faucet";
import { horizonServer } from "@/lib/stellar";
import { findTrustline } from "@/lib/trustline";

const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

const faucetBody = z.union([
  z.object({ address: z.string().regex(STELLAR_ACCOUNT, "invalid Stellar account id") }),
  z.object({ signedXdr: z.string().min(1) }),
]);

function assertCombinedTxIsSafe(tx: Transaction, issuerPublicKey: string): void {
  const usdc = new Asset("USDC", USDC_ISSUER);
  if (tx.operations.length > 2) {
    throw new ApiError(400, "INVALID_TX", "too many operations");
  }
  for (const op of tx.operations) {
    if (op.type === "changeTrust") {
      if (op.source && op.source !== tx.source) {
        throw new ApiError(400, "INVALID_TX", "unexpected changeTrust source");
      }
      if (!(op.line as Asset).equals(usdc)) {
        throw new ApiError(400, "INVALID_TX", "unexpected changeTrust asset");
      }
      continue;
    }
    if (op.type === "payment") {
      if (op.source !== issuerPublicKey) {
        throw new ApiError(400, "INVALID_TX", "unexpected payment source");
      }
      if (op.destination !== tx.source) {
        throw new ApiError(400, "INVALID_TX", "payment must fund the transaction's own source account");
      }
      if (!op.asset.equals(usdc)) {
        throw new ApiError(400, "INVALID_TX", "unexpected payment asset");
      }
      if (Number(op.amount) !== Number(FAUCET_AMOUNT)) {
        throw new ApiError(400, "INVALID_TX", "unexpected payment amount");
      }
      continue;
    }
    throw new ApiError(400, "INVALID_TX", `unexpected operation type: ${op.type}`);
  }
}

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

    const issuer = Keypair.fromSecret(mockUsdcIssuerSecret());

    if ("signedXdr" in body) {
      const tx = TransactionBuilder.fromXDR(body.signedXdr, NETWORK_PASSPHRASE);
      if (!(tx instanceof Transaction)) {
        throw new ApiError(400, "INVALID_TX", "fee bump transactions are not supported");
      }
      assertCombinedTxIsSafe(tx, issuer.publicKey());
      tx.sign(issuer);
      await horizonServer.submitTransaction(tx);
      return { amount: FAUCET_AMOUNT };
    }

    const usdc = new Asset("USDC", USDC_ISSUER);
    const [account, issuerAccount] = await Promise.all([
      horizonServer.loadAccount(body.address),
      horizonServer.loadAccount(issuer.publicKey()),
    ]);
    if (!findTrustline(account.balances, usdc)) {
      throw new ApiError(400, "NO_TRUSTLINE", "add a USDC trustline before requesting test USDC");
    }

    const tx = new TransactionBuilder(issuerAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(Operation.payment({ destination: body.address, asset: usdc, amount: FAUCET_AMOUNT }))
      .setTimeout(60)
      .build();
    tx.sign(issuer);
    await horizonServer.submitTransaction(tx);

    return { amount: FAUCET_AMOUNT };
  },
});
