import { jwtVerify, SignJWT } from "jose";
import { jwtSecret } from "./env";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(jwtSecret());
}

export async function issueToken(account: string): Promise<string> {
  return new SignJWT({ sub: account })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secretKey());
  if (typeof payload.sub !== "string") throw new Error("token missing sub claim");
  return payload.sub;
}

export async function issueAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey());
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function bearerToken(authorizationHeader: string | null): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("missing bearer token");
  }
  return authorizationHeader.slice("Bearer ".length);
}
