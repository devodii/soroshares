import { NextRequest, NextResponse } from "next/server";
import { NETWORK_PASSPHRASE } from "@/lib/env";
import { issueToken } from "@/lib/jwt";
import { buildChallenge, verifyChallenge } from "@/lib/sep10";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const account = req.nextUrl.searchParams.get("account");
  if (!account) {
    return NextResponse.json({ error: "missing account query param" }, { status: 400 });
  }

  try {
    const transaction = buildChallenge(account);
    return NextResponse.json({ transaction, network_passphrase: NETWORK_PASSPHRASE });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const transaction = body?.transaction;
  if (typeof transaction !== "string") {
    return NextResponse.json({ error: "missing transaction in request body" }, { status: 400 });
  }

  try {
    const account = verifyChallenge(transaction);
    const token = await issueToken(account);
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
