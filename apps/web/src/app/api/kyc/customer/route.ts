import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, apiHandler } from "@/lib/api-handler";
import { authorizeDpriTrustline } from "@/lib/authorize-trustline";
import { decide } from "@/lib/kyc-approval";
import { getKyc, KycStatus, putKyc } from "@/lib/kyc-store";

const kycSubmission = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  birth_date: z.string().min(1),
  address_country_code: z.string().min(1),
  bank_account_number: z.string().min(1),
  email_address: z.string().min(1),
});

export const PUT = apiHandler({
  auth: "bearer",
  schema: { body: kycSubmission },
  handler: async ({ body, account }) => {
    const decision = decide(body);
    let status: KycStatus = decision.status;
    let message = decision.message;

    if (decision.status === "ACCEPTED") {
      const authResult = await authorizeDpriTrustline(account);
      if (authResult.status === "NEEDS_TRUSTLINE") {
        status = "NEEDS_INFO";
        message = "add DPRI trustline first";
      }
    }

    const existing = await getKyc(account);
    const record = { id: existing?.id ?? randomUUID(), status, message, ...body };
    await putKyc(account, record);
    return record;
  },
});

export const GET = apiHandler({
  auth: "bearer",
  handler: async ({ account }) => {
    const record = await getKyc(account);
    if (!record) throw new ApiError(404, "NOT_FOUND", "no KYC record for this account");
    return record;
  },
});
