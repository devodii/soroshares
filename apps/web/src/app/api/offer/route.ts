import { Client } from "@soroshares/contract-client";
import { NextResponse } from "next/server";
import { NETWORK_PASSPHRASE, OFFER_CONTRACT, RPC_URL } from "@/lib/env";

export async function GET(): Promise<NextResponse> {
  const client = new Client({
    contractId: OFFER_CONTRACT,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
  });

  try {
    const tx = await client.get_offer();
    const offer = tx.result.unwrap();
    return NextResponse.json({
      admin: offer.admin,
      usdc: offer.usdc,
      share: offer.share,
      price: offer.price.toString(),
      min_shares: offer.min_shares.toString(),
      close_ledger: offer.close_ledger,
      grace_ledgers: offer.grace_ledgers,
      total_shares: offer.total_shares.toString(),
      finalized: offer.finalized,
      allotment_bps: offer.allotment_bps,
      contract: OFFER_CONTRACT,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
