// F5: server-side helpers for photo scanning (database use). The pure rules live in ./access.
//
// The usage table holds only user id and time: no image, no text, no result.

import { prisma } from "../db";
import { decideQuota, USAGE_RETENTION_MS, WINDOW_MS, type QuotaDecision } from "./access";

export type Reservation =
    | { ok: true; id: string; remaining: number }
    | { ok: false; reason: Extract<QuotaDecision, { ok: false }>["reason"] };

/**
 * Count one scan BEFORE calling Google, so parallel requests cannot all slip under the limit.
 * Insert first, then count: when two requests race, both see each other and the stricter outcome
 * wins (never a looser one). A rejected attempt removes its own row.
 */
export async function reserveScan(userId: string, globalBudget: number, now: Date = new Date()): Promise<Reservation> {
    const row = await prisma.labelScanUsage.create({ data: { userId }, select: { id: true } });
    const since = new Date(now.getTime() - WINDOW_MS);
    const [userCount, globalCount] = await Promise.all([
        prisma.labelScanUsage.count({ where: { userId, createdAt: { gte: since } } }),
        prisma.labelScanUsage.count({ where: { createdAt: { gte: since } } }),
    ]);
    // The count includes the row just inserted.
    const decision = decideQuota({ userCount: userCount - 1, globalCount: globalCount - 1, globalBudget });
    if (!decision.ok) {
        await refundScan(row.id);
        return { ok: false, reason: decision.reason };
    }
    // Housekeeping: old rows are useless. Never fail the scan because of it.
    prisma.labelScanUsage
        .deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - USAGE_RETENTION_MS) } } })
        .catch(() => undefined);
    return { ok: true, id: row.id, remaining: decision.remaining };
}

/** Give a scan back (Google was busy, the answer was unusable): the user should not pay for our failure. */
export async function refundScan(id: string): Promise<void> {
    try {
        await prisma.labelScanUsage.delete({ where: { id } });
    } catch {
        // already gone
    }
}

/** How many scans the user has left in the last 24 hours (for the screen). */
export async function remainingScans(userId: string, perUser: number, now: Date = new Date()): Promise<number> {
    const used = await prisma.labelScanUsage.count({ where: { userId, createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } } });
    return Math.max(0, perUser - used);
}
