import { apiError, apiOk, clientIp, parseBody } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { refreshBody } from "@/lib/mobile/schemas";
import { rateLimit, rotateRefreshToken } from "@/lib/mobile/sessions";

// POST /api/v1/auth/refresh – { refreshToken } -> a new token pair. The old refresh token stops working.
// 401 with code "invalid_token" means the app must send the user back to the sign-in screen.
export async function POST(request: Request) {
    const limited = await rateLimit([{ rule: RATE_RULES.refreshIp, callerKey: clientIp(request) }]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    const parsed = await parseBody(request, refreshBody);
    if ("response" in parsed) return parsed.response;

    try {
        const result = await rotateRefreshToken(parsed.data.refreshToken, parsed.data.device ?? {});
        if (!result.ok) return apiError(401, "invalid_token", "Please sign in again.");
        return apiOk(result.tokens);
    } catch (error) {
        console.error("v1 refresh error:", error);
        return apiError(500, "server_error", "Something went wrong. Please try again.");
    }
}
