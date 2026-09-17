import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiHandler } from "@/lib/api-handler";
import { serverEnv } from "@/lib/env.server";
import { issueAdminSession } from "@/lib/jwt";

const loginBody = z.object({ password: z.string().min(1) });

export const POST = apiHandler({
  rateLimit: 10,
  schema: { body: loginBody },
  handler: async ({ body }) => {
    if (body.password !== serverEnv.ADMIN_UI_PASSWORD) {
      throw new ApiError(401, "UNAUTHORIZED", "wrong password");
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
  },
});
