import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  ISSUER_SECRET: z.string().min(1),
  ADMIN_SECRET: z.string().min(1),
  MOCK_USDC_ISSUER_SECRET: z.string().min(1),
  SERVER_SIGNING_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  ADMIN_UI_PASSWORD: z.string().min(1),
  USE_MOCK_USDC: z.preprocess((val) => val === "true", z.boolean()),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid server environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid server environment variables");
}

export const serverEnv = parsed.data;
