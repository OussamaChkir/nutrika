"use server";

import { cookies } from "next/headers";

import { checkAccountDeletion, type DeleteAccountResult } from "./account-delete";
import { auth, signOut } from "./auth";
import { deleteAccountData } from "./account-delete-data";
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
        await deleteAccountData(userId);
    } catch {
        return { ok: false, error: "failed" };
    }

    (await cookies()).delete(ACTIVE_PROFILE_COOKIE);
    await signOut({ redirectTo: "/" });
    return { ok: false, error: "failed" }; // unreachable: signOut redirects
}
