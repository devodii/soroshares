import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeDpriTrustline } from "@/lib/authorize-trustline";
import { bearerToken, verifyToken } from "@/lib/jwt";
import { decide, KycSubmission } from "@/lib/kyc-approval";
import { getKyc, putKyc } from "@/lib/kyc-store";

function requiredFields(body: unknown): body is KycSubmission {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.first_name === "string" &&
    typeof b.last_name === "string" &&
    typeof b.birth_date === "string" &&
    typeof b.address_country_code === "string" &&
    typeof b.bank_account_number === "string" &&
    typeof b.email_address === "string"
  );
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  let account: string;
  try {
    account = await verifyToken(bearerToken(req.headers.get("authorization")));
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!requiredFields(body)) {
    return NextResponse.json({ error: "missing required KYC fields" }, { status: 400 });
  }

  const decision = decide(body);
  let status: "ACCEPTED" | "REJECTED" | "NEEDS_INFO" = decision.status;
  let message = decision.message;

  if (decision.status === "ACCEPTED") {
    try {
      const authResult = await authorizeDpriTrustline(account);
      if (authResult.status === "NEEDS_TRUSTLINE") {
        status = "NEEDS_INFO";
        message = "add DPRI trustline first";
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  }

  const record = {
    id: getKyc(account)?.id ?? randomUUID(),
    status,
    message,
    ...body,
  };
  putKyc(account, record);

  return NextResponse.json(record);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  let account: string;
  try {
    account = await verifyToken(bearerToken(req.headers.get("authorization")));
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const record = getKyc(account);
  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(record);
}
