import { NextResponse } from "next/server";
import type { ZodTypeAny, z } from "zod";

import { verifyAccessToken, parseBearer, type AccessClaims } from "./tokens";

// Small helpers shared by the /api/v1 route handlers.
// Every error has the same shape, so the app can handle them in one place:
//   { "error": { "code": "invalid_credentials", "message": "..." } }

export type ApiErrorCode =
    | "invalid_request"
    | "unauthorized"
    | "invalid_credentials"
    | "invalid_token"
    | "token_expired"
    | "email_taken"
    | "email_unverified"
    | "email_missing"
    | "email_mismatch"
    | "admin_blocked"
    | "rate_limited"
    | "not_configured"
    | "not_found"
    | "server_error";

export function apiError(
    status: number,
    code: ApiErrorCode,
    message: string,
    extra: { details?: unknown; retryAfterSeconds?: number } = {}
): NextResponse {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (extra.retryAfterSeconds) headers["Retry-After"] = String(extra.retryAfterSeconds);
    return NextResponse.json({ error: { code, message, ...(extra.details ? { details: extra.details } : {}) } }, { status, headers });
}

export function apiOk<T>(body: T, status = 200): NextResponse {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Parses and validates a JSON body. Returns the data or a ready-made 400 response. */
export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { response: NextResponse }> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return { response: apiError(400, "invalid_request", "The request body must be JSON.") };
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        return {
            response: apiError(400, "invalid_request", parsed.error.errors[0]?.message || "Invalid request.", {
                details: parsed.error.flatten().fieldErrors,
            }),
        };
    }
    return { data: parsed.data };
}

/** Best guess of the caller's IP behind Vercel's proxy. Only used as a rate-limit key. */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Checks the bearer token. Stateless: no database call. */
export async function authenticate(request: Request): Promise<{ claims: AccessClaims } | { response: NextResponse }> {
    const token = parseBearer(request.headers.get("authorization"));
    if (!token) return { response: apiError(401, "unauthorized", "Missing bearer token.") };
    const claims = await verifyAccessToken(token);
    if (!claims) return { response: apiError(401, "token_expired", "The access token is invalid or has expired.") };
    return { claims };
}
