import { verifyPassword } from "@/lib/mobile/credentials";
import { apiError, apiOk, clientIp, parseBody } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { loginBody } from "@/lib/mobile/schemas";
import { rateLimit, startSession } from "@/lib/mobile/sessions";
import { toMobileUser } from "@/lib/mobile/user";

// POST /api/v1/auth/login – email + password, returns the user and a token pair.
export async function POST(request: Request) {
    const parsed = await parseBody(request, loginBody);
    if ("response" in parsed) return parsed.response;
    const { email, password, device } = parsed.data;

    const limited = await rateLimit([
        { rule: RATE_RULES.loginIp, callerKey: clientIp(request) },
        { rule: RATE_RULES.loginEmail, callerKey: email },
    ]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    try {
        const user = await verifyPassword(email, password);
        if (!user) return apiError(401, "invalid_credentials", "Invalid email or password.");

        const tokens = await startSession(user.id, user.role, device);
        return apiOk({ user: toMobileUser(user), ...tokens });
    } catch (error) {
        console.error("v1 login error:", error);
        return apiError(500, "server_error", "Something went wrong. Please try again.");
    }
}
