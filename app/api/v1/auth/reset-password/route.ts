import { resetPasswordAction } from "@/lib/auth-actions";
import { apiError, apiOk, clientIp, parseBody } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { resetBody } from "@/lib/mobile/schemas";
import { rateLimit } from "@/lib/mobile/sessions";

// POST /api/v1/auth/reset-password – { token, password }. The token comes from the link in the reset
// email. On success every device is signed out (refresh tokens are deleted); the app then asks the
// user to sign in with the new password.
export async function POST(request: Request) {
    const limited = await rateLimit([{ rule: RATE_RULES.resetIp, callerKey: clientIp(request) }]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    const parsed = await parseBody(request, resetBody);
    if ("response" in parsed) return parsed.response;
    const { token, password } = parsed.data;

    const result = await resetPasswordAction(token, password, password);
    if (!result.success) return apiError(400, "invalid_token", result.error ?? "This reset link is invalid or has expired.");
    return apiOk({ ok: true });
}
