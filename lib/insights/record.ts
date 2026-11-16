// F9: write one ScanEvent when a signed-in user who turned insights on scans a product.
// Server only. Never throws into the caller's flow: scan history is the main job of the route,
// insights are a bonus.

import { cookies } from "next/headers";

import { prisma } from "../db";
import { productFromStored, type StoredProduct } from "../product";
import { ACTIVE_PROFILE_COOKIE } from "../profiles/constants";
import { pickActiveProfile } from "../profiles/active";
import { DAY_MS, RETENTION_DAYS } from "./rules";
import { buildScanEventData, isDuplicateScan } from "./snapshot";

type ScannedProduct = StoredProduct & { score: number; scoreLetter: unknown };

export async function recordScanEvent(userId: string, product: ScannedProduct): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { scanInsightsOptIn: true } });
    if (user?.scanInsightsOptIn !== true) return;

    const now = new Date();
    const last = await prisma.scanEvent.findFirst({
        where: { userId, barcode: product.barcode },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    });
    if (isDuplicateScan(last?.createdAt, now)) return;

    // The cookie is only a hint: it is matched against this user's own profiles.
    const profiles = await prisma.profile.findMany({
        where: { userId },
        select: { id: true, isDefault: true, createdAt: true },
    });
    const cookie = (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value;
    const profileId = pickActiveProfile(profiles, cookie)?.id ?? null;

    const data = buildScanEventData(productFromStored(product), { score: product.score, grade: String(product.scoreLetter) }, profileId);
    await prisma.scanEvent.create({ data: { userId, ...data } });

    // Retention: records older than a year are deleted.
    await prisma.scanEvent.deleteMany({ where: { userId, createdAt: { lt: new Date(now.getTime() - RETENTION_DAYS * DAY_MS) } } });
}
