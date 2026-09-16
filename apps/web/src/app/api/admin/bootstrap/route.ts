import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { getBootstrapState } from "@/lib/bootstrap/state";
import { runBootstrap } from "@/lib/bootstrap/pipeline";

export const GET = apiHandler({
  auth: "admin",
  handler: async () => {
    return getBootstrapState() ?? { bootstrapped: false };
  },
});

const bootstrapBody = z.object({
  closeWindowDays: z.number().int().min(1).max(365).optional(),
  graceDays: z.number().int().min(1).max(90).optional(),
  redeploy: z.boolean().optional(),
});

export const POST = apiHandler({
  auth: "admin",
  rateLimit: 5,
  schema: { body: bootstrapBody },
  handler: async ({ body }) => {
    return runBootstrap(body);
  },
});
