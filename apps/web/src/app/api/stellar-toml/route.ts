import { Keypair } from "@stellar/stellar-sdk";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { clientEnv } from "@/lib/env.client";
import { serverEnv } from "@/lib/env.server";

export const GET = apiHandler({
  rateLimit: 60,
  handler: async () => {
    const signingKey = Keypair.fromSecret(serverEnv.SERVER_SIGNING_SECRET).publicKey();
    const origin = `https://${clientEnv.NEXT_PUBLIC_HOME_DOMAIN}`;

    const toml = `NETWORK_PASSPHRASE="${clientEnv.NEXT_PUBLIC_NETWORK_PASSPHRASE}"
WEB_AUTH_ENDPOINT="${origin}/api/auth"
KYC_SERVER="${origin}/api/kyc"
SIGNING_KEY="${signingKey}"

[DOCUMENTATION]
ORG_NAME="soroshares"
ORG_URL="https://github.com/devodii/soroshares"

[[CURRENCIES]]
code="DPRI"
issuer="${clientEnv.NEXT_PUBLIC_DPRI_ISSUER}"
is_asset_anchored=true
anchor_asset_type="stock"
anchor_asset="DPRI"
status="test"
desc="Reference IPO subscription on Stellar, modeled on the Dangote Petroleum Refinery IPO terms. Testnet only, not affiliated with Dangote."
`;

    return new NextResponse(toml, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});
