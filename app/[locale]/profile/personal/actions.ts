"use server";

// Personal profiles (F1 / F4). Server-side rules, in this order, for every action:
//   1. the feature flag is on,
//   2. the user is signed in,
//   3. the input passes profileInputSchema (including explicit consent),
//   4. the profile belongs to the signed-in user.
// Steps 3 and 4 live in lib/profiles/service.ts, which the mobile API shares.
// Profile data is never logged.

import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/flags";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profiles/constants";
import type { ProfileDto } from "@/lib/profiles/profile";
import { createProfileFor, deleteProfileFor, profileExistsFor, updateProfileFor } from "@/lib/profiles/service";

export type ProfileActionError =
    | "disabled"
    | "unauthorized"
    | "invalid"
    | "limit"
    | "not_found"
    | "failed";

export type ProfileActionResult =
    | { ok: true; profile: ProfileDto }
    | { ok: false; error: ProfileActionError };

export type DeleteProfileResult = { ok: true } | { ok: false; error: ProfileActionError };

/** Remember a profile as the active one (cookie holds only the profile id). */
async function rememberActive(id: string): Promise<void> {
    (await cookies()).set(ACTIVE_PROFILE_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    });
}

async function requireUser(): Promise<{ userId: string } | { error: ProfileActionError }> {
    if (!isFeatureEnabled("personalScore")) return { error: "disabled" };
    const session = await auth();
    if (!session?.user?.id) return { error: "unauthorized" };
    return { userId: session.user.id };
}

export async function createProfile(input: unknown): Promise<ProfileActionResult> {
    const user = await requireUser();
    if ("error" in user) return { ok: false, error: user.error };

    const result = await createProfileFor(user.userId, input);
    if (!result.ok) return result;
    // Choosing "use this profile for my scores" (or creating the first one) also makes it active.
    if (result.makeActive) await rememberActive(result.profile.id);
    return { ok: true, profile: result.profile };
}

export async function updateProfile(id: string, input: unknown): Promise<ProfileActionResult> {
    const user = await requireUser();
    if ("error" in user) return { ok: false, error: user.error };

    const result = await updateProfileFor(user.userId, id, input);
    if (!result.ok) return result;
    if (result.makeActive) await rememberActive(result.profile.id);
    return { ok: true, profile: result.profile };
}

export async function deleteProfile(id: string): Promise<DeleteProfileResult> {
    const user = await requireUser();
    if ("error" in user) return { ok: false, error: user.error };
    return deleteProfileFor(user.userId, id);
}

/**
 * Choose which profile products are scored for (F4). Stored in a cookie that holds only the
 * profile id. The profile must belong to the signed-in user; the product page also re-checks
 * the id against the user's own profiles, so the cookie is never trusted.
 */
export async function setActiveProfile(id: string): Promise<DeleteProfileResult> {
    const user = await requireUser();
    if ("error" in user) return { ok: false, error: user.error };

    try {
        if (!(await profileExistsFor(user.userId, id))) return { ok: false, error: "not_found" };
        await rememberActive(id);
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}
