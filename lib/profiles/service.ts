// Personal profiles (F1 / F4): the database side, keyed by user id.
// Used by the web server actions (app/[locale]/profile/personal/actions.ts) and the mobile API (/api/v1/profiles).
// The callers check the feature flag and the sign-in. Every query is scoped to `userId`.
// Profile data is never logged.

import { prisma } from "../db";
import { MAX_PROFILES_PER_USER, profileInputSchema, type ProfileInput } from "./constants";
import { toProfileDto, type ProfileDto } from "./profile";

export type ProfileServiceError = "invalid" | "limit" | "not_found" | "failed";

export type ProfileServiceResult =
    /** `makeActive`: the web also remembers this profile as the active one (cookie). The app does that locally. */
    | { ok: true; profile: ProfileDto; makeActive: boolean }
    | { ok: false; error: ProfileServiceError };

const OBJECT_ID = /^[a-f0-9]{24}$/i;
export const isProfileId = (id: unknown): id is string => typeof id === "string" && OBJECT_ID.test(id);

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

export async function listProfilesFor(userId: string): Promise<ProfileDto[]> {
    const rows = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return rows.map(toProfileDto);
}

/** The profile if it belongs to the user, else null. Used to validate `X-Profile-Id`. */
export async function findOwnedProfile(userId: string, id: string) {
    if (!isProfileId(id)) return null;
    return prisma.profile.findFirst({ where: { id, userId } });
}

export async function createProfileFor(userId: string, input: unknown): Promise<ProfileServiceResult> {
    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const data = storedFields(parsed.data);
    const isDefault = parsed.data.isDefault;

    try {
        const existing = await prisma.profile.count({ where: { userId } });
        if (existing >= MAX_PROFILES_PER_USER) return { ok: false, error: "limit" };

        // The first profile is always the default one.
        const makeDefault = isDefault || existing === 0;

        const row = await prisma.$transaction(async (tx) => {
            if (makeDefault) {
                await tx.profile.updateMany({ where: { userId }, data: { isDefault: false } });
            }
            return tx.profile.create({
                data: { ...data, userId, isDefault: makeDefault, consentedAt: new Date() },
            });
        });
        return { ok: true, profile: toProfileDto(row), makeActive: makeDefault };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function updateProfileFor(userId: string, id: string, input: unknown): Promise<ProfileServiceResult> {
    if (!isProfileId(id)) return { ok: false, error: "not_found" };

    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const data = storedFields(parsed.data);
    const isDefault = parsed.data.isDefault;

    try {
        const current = await prisma.profile.findFirst({ where: { id, userId } });
        if (!current) return { ok: false, error: "not_found" };

        // The default profile stays the default until another one is chosen.
        const makeDefault = isDefault || current.isDefault;

        const row = await prisma.$transaction(async (tx) => {
            if (makeDefault && !current.isDefault) {
                await tx.profile.updateMany({ where: { userId }, data: { isDefault: false } });
            }
            // `userId` in the filter is the ownership check, even though we looked it up above.
            await tx.profile.updateMany({
                where: { id, userId },
                data: { ...data, isDefault: makeDefault, consentedAt: new Date() },
            });
            return tx.profile.findFirst({ where: { id, userId } });
        });
        if (!row) return { ok: false, error: "not_found" };
        return { ok: true, profile: toProfileDto(row), makeActive: isDefault && !current.isDefault };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function deleteProfileFor(userId: string, id: string): Promise<{ ok: true } | { ok: false; error: ProfileServiceError }> {
    if (!isProfileId(id)) return { ok: false, error: "not_found" };

    try {
        const deleted = await prisma.profile.deleteMany({ where: { id, userId } });
        if (deleted.count === 0) return { ok: false, error: "not_found" };

        // Scan records made with this profile go with it (F9); a failure here must not undo the delete.
        await prisma.scanEvent.deleteMany({ where: { userId, profileId: id } }).catch(() => undefined);

        // If the default profile was deleted, promote the oldest remaining one.
        const remaining = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
        if (remaining.length > 0 && !remaining.some((p) => p.isDefault)) {
            await prisma.profile.updateMany({ where: { id: remaining[0].id, userId }, data: { isDefault: true } });
        }
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

/** Does this profile belong to the user? (`setActiveProfile` on the web.) */
export async function profileExistsFor(userId: string, id: string): Promise<boolean> {
    if (!isProfileId(id)) return false;
    const owned = await prisma.profile.findFirst({ where: { id, userId }, select: { id: true } });
    return owned !== null;
}
