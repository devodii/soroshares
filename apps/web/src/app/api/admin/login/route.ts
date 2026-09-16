import { NextRequest, NextResponse } from "next/server";
import { adminUiPassword } from "@/lib/env";
import { issueAdminSession } from "@/lib/jwt";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  if (body?.password !== adminUiPassword()) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  const token = await issueAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}
