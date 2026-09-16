import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRedisStore } from "./redis-store";
import { bearerToken, verifyAdminSession, verifyToken } from "./jwt";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function requireBearerAccount(req: NextRequest): Promise<string> {
  try {
    return await verifyToken(bearerToken(req.headers.get("authorization")));
  } catch {
    throw new ApiError(401, "UNAUTHORIZED", "missing or invalid bearer token");
  }
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface IdempotencyRecord {
  status: number;
  body: unknown;
  lockedAt: number;
  completedAt?: number;
}

const rateLimitStore = createRedisStore<RateLimitRecord>("rate-limits");
const idempotencyStore = createRedisStore<IdempotencyRecord>("idempotency");

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 30;
const IDEMPOTENCY_LOCK_TIMEOUT_MS = 60_000;

function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function checkRateLimit(
  key: string,
  limit: number,
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const existing = await rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    await rateLimitStore.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  await rateLimitStore.set(key, { count: existing.count + 1, resetAt: existing.resetAt });
  return { ok: true, remaining: limit - existing.count - 1, resetAt: existing.resetAt };
}

export interface HandlerArgs<TBody, TQuery> {
  body: TBody;
  query: TQuery;
  req: NextRequest;
}

export interface HandlerConfig<TBody, TQuery> {
  schema?: {
    body?: z.ZodType<TBody>;
    query?: z.ZodType<TQuery>;
  };
  auth?: "admin";
  /** Requests per minute per client IP + route. */
  rateLimit?: number;
  handler: (args: HandlerArgs<TBody, TQuery>) => Promise<unknown>;
}

function issuesToMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}

export function apiHandler<TBody = unknown, TQuery = unknown>(
  config: HandlerConfig<TBody, TQuery>,
) {
  return async (req: NextRequest): Promise<Response> => {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    const isIdempotent = Boolean(idempotencyKey) && req.method === "POST";

    try {
      if (config.auth === "admin") {
        const authorized = await verifyAdminSession(req.cookies.get("admin_session")?.value);
        if (!authorized) throw new ApiError(401, "UNAUTHORIZED", "admin session required");
      }

      const limit = config.rateLimit ?? DEFAULT_RATE_LIMIT;
      const rl = await checkRateLimit(`${req.nextUrl.pathname}:${clientKey(req)}`, limit);
      const responseHeaders = {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000)),
      };
      if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "too many requests, try again shortly");

      if (isIdempotent && idempotencyKey) {
        const stored = await idempotencyStore.get(idempotencyKey);
        if (stored?.completedAt) {
          return NextResponse.json(stored.body, {
            status: stored.status,
            headers: responseHeaders,
          });
        }
        if (stored && Date.now() - stored.lockedAt < IDEMPOTENCY_LOCK_TIMEOUT_MS) {
          throw new ApiError(409, "REQUEST_IN_PROGRESS", "this request is already being processed");
        }
        await idempotencyStore.set(idempotencyKey, { status: 0, body: null, lockedAt: Date.now() });
      }

      let body = undefined as TBody;
      if (config.schema?.body) {
        const json = await req.json().catch(() => ({}));
        const parsed = config.schema.body.safeParse(json);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", issuesToMessage(parsed.error));
        }
        body = parsed.data;
      }

      let query = undefined as TQuery;
      if (config.schema?.query) {
        const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
        const parsed = config.schema.query.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", issuesToMessage(parsed.error));
        }
        query = parsed.data;
      }

      const result = await config.handler({ body, query, req });

      // A Response means the handler wants a non-JSON reply (e.g. stellar.toml); skip caching it.
      if (result instanceof Response) return result;

      if (isIdempotent && idempotencyKey) {
        await idempotencyStore.set(idempotencyKey, {
          status: 200,
          body: result,
          lockedAt: Date.now(),
          completedAt: Date.now(),
        });
      }

      return NextResponse.json(result, { headers: responseHeaders });
    } catch (error) {
      if (isIdempotent && idempotencyKey) await idempotencyStore.delete(idempotencyKey);

      const isApiError = error instanceof ApiError;
      const status = isApiError ? error.status : 500;
      const code = isApiError ? error.code : "INTERNAL_ERROR";
      const message = isApiError ? error.message : "an internal error occurred";
      if (!isApiError) {
        console.error(`[API_ERROR] ${req.method} ${req.nextUrl.pathname}:`, error);
      }
      return NextResponse.json({ error: { code, message } }, { status });
    }
  };
}
