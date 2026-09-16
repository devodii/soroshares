import { randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { apiHandler } from "@/lib/api-handler";

// Ungated on purpose: this is how you get the value that becomes ADMIN_UI_PASSWORD.
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
