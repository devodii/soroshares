import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_NETWORK_PASSPHRASE: z.string().min(1),
  NEXT_PUBLIC_HORIZON_URL: z.url(),
  NEXT_PUBLIC_RPC_URL: z.url(),
  NEXT_PUBLIC_HOME_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_DPRI_ISSUER: z.string().default(""),
  NEXT_PUBLIC_DPRI_SAC: z.string().default(""),
  NEXT_PUBLIC_USDC_ISSUER: z.string().default(""),
  NEXT_PUBLIC_USDC_SAC: z.string().default(""),
  NEXT_PUBLIC_OFFER_CONTRACT: z.string().default(""),
  NEXT_PUBLIC_ADMIN_PUBLIC: z.string().default(""),
  NEXT_PUBLIC_DEMO_CLOSE_LEDGER: z.coerce.number().default(0),
  NEXT_PUBLIC_PRICE_NGN: z.coerce.number(),
  NEXT_PUBLIC_PRICE_USDC: z.coerce.number(),
  NEXT_PUBLIC_MIN_SHARES: z.coerce.number(),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_NETWORK_PASSPHRASE: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
  NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_HOME_DOMAIN: process.env.NEXT_PUBLIC_HOME_DOMAIN,
  NEXT_PUBLIC_DPRI_ISSUER: process.env.NEXT_PUBLIC_DPRI_ISSUER,
  NEXT_PUBLIC_DPRI_SAC: process.env.NEXT_PUBLIC_DPRI_SAC,
  NEXT_PUBLIC_USDC_ISSUER: process.env.NEXT_PUBLIC_USDC_ISSUER,
  NEXT_PUBLIC_USDC_SAC: process.env.NEXT_PUBLIC_USDC_SAC,
  NEXT_PUBLIC_OFFER_CONTRACT: process.env.NEXT_PUBLIC_OFFER_CONTRACT,
  NEXT_PUBLIC_ADMIN_PUBLIC: process.env.NEXT_PUBLIC_ADMIN_PUBLIC,
  NEXT_PUBLIC_DEMO_CLOSE_LEDGER: process.env.NEXT_PUBLIC_DEMO_CLOSE_LEDGER,
  NEXT_PUBLIC_PRICE_NGN: process.env.NEXT_PUBLIC_PRICE_NGN,
  NEXT_PUBLIC_PRICE_USDC: process.env.NEXT_PUBLIC_PRICE_USDC,
  NEXT_PUBLIC_MIN_SHARES: process.env.NEXT_PUBLIC_MIN_SHARES,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
});

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables");
}

export const clientEnv = parsed.data;
