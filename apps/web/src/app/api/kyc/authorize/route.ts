import { NextRequest, NextResponse } from "next/server";
import { authorizeDpriTrustline } from "@/lib/authorize-trustline";
import { bearerToken, verifyToken } from "@/lib/jwt";
import { getKyc } from "@/lib/kyc-store";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let account: string;
  try {
    account = await verifyToken(bearerToken(req.headers.get("authorization")));
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const record = getKyc(account);
  if (record?.status !== "ACCEPTED") {
    return NextResponse.json({ error: "kyc not accepted" }, { status: 400 });
  }

  const result = await authorizeDpriTrustline(account);
  return NextResponse.json(result);
}
