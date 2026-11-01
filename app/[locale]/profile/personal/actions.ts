"use server";

// Personal profiles (F1 / F4). Server-side rules, in this order, for every action:
//   1. the feature flag is on,
//   2. the user is signed in,
//   3. the input passes profileInputSchema (including explicit consent),
//   4. the profile belongs to the signed-in user.
// Profile data is never logged.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
import { MAX_PROFILES_PER_USER, profileInputSchema, type ProfileInput } from "@/lib/profiles/constants";
import { toProfileDto, type ProfileDto } from "@/lib/profiles/profile";

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

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** The fields stored on a profile. `consent` only gates the save, it is not stored as a flag. */
function storedFields(input: ProfileInput) {
    return {
        name: input.name,
        ageBand: input.ageBand,
        conditions: input.conditions,
        diets: input.diets,
        goals: input.goals,
        allergens: input.allergens,
        allergenStrictness: input.allergenStrictness,
    };
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

    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const data = storedFields(parsed.data);
    const isDefault = parsed.data.isDefault;

    try {
        const existing = await prisma.profile.count({ where: { userId: user.userId } });
        if (existing >= MAX_PROFILES_PER_USER) return { ok: false, error: "limit" };

        // The first profile is always the default one.
        const makeDefault = isDefault || existing === 0;

        const row = await prisma.$transaction(async (tx) => {
            if (makeDefault) {
                await tx.profile.updateMany({ where: { userId: user.userId }, data: { isDefault: false } });
            }
            return tx.profile.create({
                data: { ...data, userId: user.userId, isDefault: makeDefault, consentedAt: new Date() },
            });
        });
        return { ok: true, profile: toProfileDto(row) };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function updateProfile(id: string, input: unknown): Promise<ProfileActionResult> {
    const user = await requireUser();
    if ("error" in user) return { ok: false, error: user.error };
    if (typeof id !== "string" || !OBJECT_ID.test(id)) return { ok: false, error: "not_found" };

    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const data = storedFields(parsed.data);
    const isDefault = parsed.data.isDefault;

    try {
        const current = await prisma.profile.findFirst({ where: { id, userId: user.userId } });
        if (!current) return { ok: false, error: "not_found" };

        // The default profile stays the default until another one is chosen.
        const makeDefault = isDefault || current.isDefault;

        const row = await prisma.$transaction(async (tx) => {
            if (makeDefault && !current.isDefault) {
                await tx.profile.updateMany({ where: { userId: user.userId }, data: { isDefault: false } });
            }
            // `userId` in the filter is the ownership check, even though we looked it up above.
            await tx.profile.updateMany({
                where: { id, userId: user.userId },
                data: { ...data, isDefault: makeDefault, consentedAt: new Date() },
            });
            return tx.profile.findFirst({ where: { id, userId: user.userId } });
        });
        if (!row) return { ok: false, error: "not_found" };
        return { ok: true, profile: toProfileDto(row) };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function deleteProfile(id: string): Promise<DeleteProfileResult> {
    const user = await requireUser();
    if ("error" in user) return { ok: false, error: user.error };
    if (typeof id !== "string" || !OBJECT_ID.test(id)) return { ok: false, error: "not_found" };

    try {
        const deleted = await prisma.profile.deleteMany({ where: { id, userId: user.userId } });
        if (deleted.count === 0) return { ok: false, error: "not_found" };

        // If the default profile was deleted, promote the oldest remaining one.
        const remaining = await prisma.profile.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: "asc" },
        });
        if (remaining.length > 0 && !remaining.some((p) => p.isDefault)) {
            await prisma.profile.updateMany({
                where: { id: remaining[0].id, userId: user.userId },
                data: { isDefault: true },
            });
        }
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}
