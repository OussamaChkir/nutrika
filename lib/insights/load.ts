// F9: everything the Insights page reads, in one server function. Every query is scoped to the
// user. Kept out of the page component so the page stays a thin layout.

import { cookies } from "next/headers";

import { prisma } from "../db";
import { pickActiveProfile } from "../profiles/active";
import { ACTIVE_PROFILE_COOKIE } from "../profiles/constants";
import { buildInsights, eventsForProfile, type InsightsResult, type TimedScan } from "./generators";
import { ANALYSIS_DAYS, DAY_MS, MAX_EVENTS_READ } from "./rules";

export interface InsightsPageData {
    enabled: boolean;
    recordsCount: number;
    result: InsightsResult;
    /** Name of the active profile, only when the account has more than one. */
    profileName: string | null;
}

export async function loadInsights(userId: string): Promise<InsightsPageData> {
    const now = Date.now();
    const [user, recordsCount, rows, profiles] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { scanInsightsOptIn: true } }),
        prisma.scanEvent.count({ where: { userId } }),
        prisma.scanEvent.findMany({
            where: { userId, createdAt: { gte: new Date(now - ANALYSIS_DAYS * DAY_MS) } },
            orderBy: { createdAt: "desc" },
            take: MAX_EVENTS_READ,
            select: {
                barcode: true, score: true, grade: true, sugar100: true, salt100: true, satFat100: true,
                protein100: true, nova: true, category: true, brand: true, highSugar: true, profileId: true, createdAt: true,
            },
        }),
        prisma.profile.findMany({ where: { userId }, select: { id: true, name: true, isDefault: true, createdAt: true } }),
    ]);

    // The cookie is only a hint: it is matched against this user's own profiles.
    const active = pickActiveProfile(profiles, (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value);
    const events: TimedScan[] = eventsForProfile(rows, active?.id ?? null);
    return {
        enabled: user?.scanInsightsOptIn === true,
        recordsCount,
        result: buildInsights(events, now),
        profileName:
            profiles.length > 1 ? (profiles.find((p: { id: string; name: string }) => p.id === active?.id)?.name ?? null) : null,
    };
}
