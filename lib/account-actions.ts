"use server";

import { cookies } from "next/headers";

import { checkAccountDeletion, type DeleteAccountResult } from "./account-delete";
import { auth, signOut } from "./auth";
import { prisma } from "./db";
import { ACTIVE_PROFILE_COOKIE } from "./profiles/constants";

/**
 * Permanently delete the signed-in user's account and everything linked to it.
 * Steps are ordered and idempotent: if one fails, running it again finishes the job.
 * Products the user added stay in the shared catalogue, without their name.
 * On success the user is signed out and redirected, so this only returns on failure.
 */
export async function deleteAccount(typedEmail: string): Promise<DeleteAccountResult> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { ok: false, error: "unauthorized" };

    const account = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!account) return { ok: false, error: "unauthorized" };

    const check = checkAccountDeletion(account, String(typedEmail ?? ""));
    if (check !== "ok") return { ok: false, error: check };

    try {
        await prisma.contribution.updateMany({ where: { reviewedById: userId }, data: { reviewedById: null } });
        await prisma.product.updateMany({ where: { createdById: userId }, data: { createdById: null } });
        await prisma.contribution.deleteMany({ where: { userId } });
        await prisma.profile.deleteMany({ where: { userId } });
        await prisma.scanHistory.deleteMany({ where: { userId } });
        await prisma.favorite.deleteMany({ where: { userId } });
        await prisma.savedProduct.deleteMany({ where: { userId } });
        await prisma.shoppingListItem.deleteMany({ where: { userId } });
        await prisma.productFeedback.deleteMany({ where: { userId } });
        await prisma.session.deleteMany({ where: { userId } });
        await prisma.account.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
    } catch {
        return { ok: false, error: "failed" };
    }

    (await cookies()).delete(ACTIVE_PROFILE_COOKIE);
    await signOut({ redirectTo: "/" });
    return { ok: false, error: "failed" }; // unreachable: signOut redirects
}
