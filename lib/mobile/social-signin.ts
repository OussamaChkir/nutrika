import { prisma } from "../db";

import { apiError, apiOk, clientIp, parseBody } from "./http";
import { RATE_RULES } from "./rate-limit-db";
import { socialBody } from "./schemas";
import { rateLimit, startSession } from "./sessions";
import { cleanName, planSocialSignIn, SocialTokenError, verifyIdToken, type SocialProvider } from "./social";
import { toMobileUser, USER_SELECT } from "./user";

/** Shared by POST /api/v1/auth/apple and /google: same flow, different provider keys. */
export async function handleSocialSignIn(request: Request, provider: SocialProvider): Promise<Response> {
    const limited = await rateLimit([{ rule: RATE_RULES.socialIp, callerKey: clientIp(request) }]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    const parsed = await parseBody(request, socialBody);
    if ("response" in parsed) return parsed.response;
    const { idToken, nonce, fullName, device } = parsed.data;

    try {
        const identity = await verifyIdToken(provider, idToken, { nonce });

        const linked = await prisma.account.findUnique({
            where: { provider_providerAccountId: { provider, providerAccountId: identity.providerAccountId } },
            select: { userId: true },
        });
        const byEmail = !linked && identity.email
            ? await prisma.user.findFirst({
                where: { email: { equals: identity.email, mode: "insensitive" } },
                select: { id: true, emailVerified: true, passwordHash: true },
            })
            : null;

        const plan = planSocialSignIn({
            identity,
            linkedUserId: linked?.userId ?? null,
            userByEmail: byEmail
                ? { id: byEmail.id, emailVerified: byEmail.emailVerified, hasPassword: !!byEmail.passwordHash }
                : null,
            providedName: fullName,
        });

        if (plan.action === "reject") {
            return plan.reason === "email_missing"
                ? apiError(400, "email_missing", "The provider did not share an email address.")
                : apiError(400, "email_unverified", "The provider has not verified this email address.");
        }

        let userId: string;
        const accountData = (uid: string) => ({
            userId: uid,
            type: "oidc",
            provider,
            providerAccountId: identity.providerAccountId,
        });

        if (plan.action === "sign_in") {
            userId = plan.userId;
        } else if (plan.action === "link") {
            userId = plan.userId;
            await prisma.account.create({ data: accountData(userId) });
            await prisma.user.update({
                where: { id: userId },
                data: {
                    emailVerified: byEmail?.emailVerified ?? new Date(),
                    ...(plan.clearPassword ? { passwordHash: null } : {}),
                },
            });
        } else {
            const created = await prisma.user.create({
                data: {
                    email: plan.email,
                    name: plan.name ?? cleanName(plan.email.split("@")[0]),
                    image: identity.picture,
                    emailVerified: new Date(),
                    role: "USER",
                    accounts: { create: { type: "oidc", provider, providerAccountId: identity.providerAccountId } },
                },
                select: { id: true },
            });
            userId = created.id;
        }

        const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
        if (!user) return apiError(500, "server_error", "Something went wrong. Please try again.");

        const tokens = await startSession(user.id, user.role, device);
        return apiOk({ user: toMobileUser(user), isNewUser: plan.action === "create", ...tokens });
    } catch (error) {
        if (error instanceof SocialTokenError) {
            if (error.reason === "not_configured") return apiError(503, "not_configured", `Sign in with ${provider === "apple" ? "Apple" : "Google"} is not configured on the server.`);
            return apiError(401, "invalid_token", "The identity token could not be verified.");
        }
        console.error(`v1 ${provider} sign-in error:`, error);
        return apiError(500, "server_error", "Something went wrong. Please try again.");
    }
}
