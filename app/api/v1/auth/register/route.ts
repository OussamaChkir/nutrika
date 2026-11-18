import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { findUserByEmail } from "@/lib/mobile/credentials";
import { apiError, apiOk, clientIp, parseBody } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { registerBody } from "@/lib/mobile/schemas";
import { rateLimit, startSession } from "@/lib/mobile/sessions";
import { toMobileUser, USER_SELECT } from "@/lib/mobile/user";

// POST /api/v1/auth/register – create an account with email + password and sign in.
export async function POST(request: Request) {
    const limited = await rateLimit([{ rule: RATE_RULES.registerIp, callerKey: clientIp(request) }]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    const parsed = await parseBody(request, registerBody);
    if ("response" in parsed) return parsed.response;
    const { name, email, password, device } = parsed.data;

    try {
        // Web sign-ups were not lowercased, so this also matches "Foo@x.com" when "foo@x.com" registers.
        const existing = await findUserByEmail(email);
        if (existing) return apiError(409, "email_taken", "An account with this email already exists.");

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email, passwordHash, role: "USER" },
            select: USER_SELECT,
        });

        const tokens = await startSession(user.id, user.role, device);
        return apiOk({ user: toMobileUser(user), ...tokens }, 201);
    } catch (error) {
        console.error("v1 register error:", error);
        return apiError(500, "server_error", "Something went wrong. Please try again.");
    }
}
