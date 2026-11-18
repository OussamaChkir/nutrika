import { checkAccountDeletion } from "@/lib/account-delete";
import { deleteAccountData } from "@/lib/account-delete-data";
import { prisma } from "@/lib/db";
import { apiError, apiOk, authenticate, parseBody } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { deleteBody } from "@/lib/mobile/schemas";
import { rateLimit } from "@/lib/mobile/sessions";
import { toMobileUser, USER_SELECT } from "@/lib/mobile/user";

// GET /api/v1/me – the signed-in user.
export async function GET(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    const user = await prisma.user.findUnique({ where: { id: authed.claims.userId }, select: USER_SELECT });
    // A valid token for a deleted account: treat as signed out.
    if (!user) return apiError(401, "unauthorized", "This account no longer exists.");
    return apiOk({ user: toMobileUser(user) });
}

// DELETE /api/v1/me – { email }: permanently deletes the account and all its data (App Store rule 5.1.1(v)).
// Same confirmation as the website: the user types their own email. Admins cannot delete themselves here.
export async function DELETE(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const userId = authed.claims.userId;

    const limited = await rateLimit([{ rule: RATE_RULES.deleteUser, callerKey: userId }]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

    const parsed = await parseBody(request, deleteBody);
    if ("response" in parsed) return parsed.response;

    const account = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!account) return apiError(401, "unauthorized", "This account no longer exists.");

    const check = checkAccountDeletion(account, parsed.data.email);
    if (check === "email_mismatch") return apiError(400, "email_mismatch", "The email does not match this account.");
    if (check === "admin_blocked") return apiError(403, "admin_blocked", "Administrator accounts cannot be deleted from the app.");

    try {
        await deleteAccountData(userId);
    } catch (error) {
        console.error("v1 delete account error:", error);
        return apiError(500, "server_error", "Could not delete the account. Please try again.");
    }
    return apiOk({ ok: true });
}
