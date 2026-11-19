// Scan history (the last 10 products, one row each), keyed by user id.
// Used by GET/POST /api/scan-history (web) and /api/v1/scan-history (mobile).

import { prisma } from "../db";
import { isFeatureEnabled } from "../flags";
import { recordScanEvent } from "../insights/record";

export const MAX_HISTORY = 10;

export async function listScanHistory(userId: string) {
    return prisma.scanHistory.findMany({
        where: { userId },
        orderBy: { scannedAt: "desc" },
        take: MAX_HISTORY,
        include: {
            product: {
                select: {
                    id: true,
                    barcode: true,
                    name: true,
                    brand: true,
                    imageUrl: true,
                    score: true,
                    scoreLetter: true,
                    scoreColor: true,
                },
            },
        },
    });
}

/**
 * Records a scan: updates the timestamp if the user already scanned this product, keeps only the
 * latest MAX_HISTORY, and (for users who turned insights on) writes a detailed record.
 * Returns false when the product is not in the catalogue.
 * `options.activeProfileId`: see recordScanEvent. Omit it on the web (cookie).
 */
export async function recordScan(userId: string, barcode: string, options: { activeProfileId?: string | null } = {}): Promise<boolean> {
    const product = await prisma.product.findUnique({ where: { barcode } });
    if (!product) return false;

    await prisma.scanHistory.upsert({
        where: { userId_productId: { userId, productId: product.id } },
        update: { scannedAt: new Date() },
        create: { userId, productId: product.id },
    });

    // F9: a detailed record for insights, only for users who turned them on. Never fails the scan.
    if (isFeatureEnabled("scanInsights")) {
        try {
            await recordScanEvent(userId, product, options);
        } catch (error) {
            console.error("Scan event not recorded:", error instanceof Error ? error.message : "unknown error");
        }
    }

    // Prune old entries – keep only the latest MAX_HISTORY
    const allScans = await prisma.scanHistory.findMany({
        where: { userId },
        orderBy: { scannedAt: "desc" },
        select: { id: true },
    });
    if (allScans.length > MAX_HISTORY) {
        const idsToDelete = allScans.slice(MAX_HISTORY).map((s: { id: string }) => s.id);
        await prisma.scanHistory.deleteMany({ where: { id: { in: idsToDelete } } });
    }
    return true;
}
