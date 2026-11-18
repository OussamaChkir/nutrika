import { requestPasswordResetAction } from "@/lib/auth-actions";
import { apiError, apiOk, clientIp, parseBody } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { forgotBody } from "@/lib/mobile/schemas";
import { rateLimit } from "@/lib/mobile/sessions";

// POST /api/v1/auth/forgot-password – { email, locale? }. Sends the same reset email as the website
// (Resend). The answer is always { ok: true } for a valid email, whether or not an account exists.
export async function POST(request: Request) {
    const parsed = await parseBody(request, forgotBody);
    if ("response" in parsed) return parsed.response;
    const { email, locale } = parsed.data;

    const limited = await rateLimit([
        { rule: RATE_RULES.forgotIp, callerKey: clientIp(request) },
        { rule: RATE_RULES.forgotEmail, callerKey: email },
    ]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    await requestPasswordResetAction(email, locale);
    return apiOk({ ok: true }, 202);
}
