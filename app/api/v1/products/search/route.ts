import { z } from "zod";

import { apiError, apiOk, authenticate, clientIp, serviceError } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { rateLimit } from "@/lib/mobile/sessions";
import { MIN_QUERY_LENGTH, SORTS, searchCatalog } from "@/lib/products/search";

export const runtime = "nodejs";

const querySchema = z.object({
    q: z.string().trim().min(MIN_QUERY_LENGTH, "Query too short").max(100),
    scoreLetter: z.enum(["A", "B", "C", "D", "E"]).optional(),
    sort: z.enum(SORTS).optional(),
});

// GET /api/v1/products/search?q=&scoreLetter=&sort= – Open Food Facts plus our catalogue.
// Rate limited per user: every call asks Open Food Facts.
export async function GET(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    const limited = await rateLimit([
        { rule: RATE_RULES.searchUser, callerKey: authed.claims.userId },
        { rule: RATE_RULES.searchIp, callerKey: clientIp(request) },
    ]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many searches. Try again in a moment.", { retryAfterSeconds: limited.retryAfterSeconds });

    const url = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
        q: url.get("q") ?? "",
        scoreLetter: url.get("scoreLetter") ?? undefined,
        sort: url.get("sort") ?? undefined,
    });
    if (!parsed.success) return apiError(400, "invalid_request", parsed.error.errors[0]?.message ?? "Invalid request.");

    try {
        const results = await searchCatalog({ query: parsed.data.q, scoreLetter: parsed.data.scoreLetter, sort: parsed.data.sort });
        return apiOk({ results, count: results.length });
    } catch (error) {
        console.error("v1 search error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
