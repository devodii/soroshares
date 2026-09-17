import { ApiError, apiHandler } from "@/lib/api-handler";
import { authorizeDpriTrustline } from "@/lib/authorize-trustline";
import { getKyc } from "@/lib/kyc-store";

export const POST = apiHandler({
  auth: "bearer",
  handler: async ({ account }) => {
    const record = await getKyc(account);
    if (record?.status !== "ACCEPTED") {
      throw new ApiError(400, "KYC_NOT_ACCEPTED", "kyc not accepted");
    }
    return authorizeDpriTrustline(account);
  },
});
