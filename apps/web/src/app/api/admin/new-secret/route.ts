import { randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { apiHandler } from "@/lib/api-handler";

/**
 * Stateless utility so an operator can get everything .env.local needs
 * (a Stellar keypair for ISSUER_SECRET/ADMIN_SECRET/SERVER_SIGNING_SECRET,
 * a random string for JWT_SECRET/ADMIN_UI_PASSWORD) without installing the
 * Stellar CLI or any local tooling. Ungated on purpose: this is how you get
 * the value that becomes ADMIN_UI_PASSWORD in the first place.
 */
export const GET = apiHandler({
  rateLimit: 20,
  handler: async () => {
    const keypair = Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      randomHex: randomBytes(32).toString("hex"),
    };
  },
});
