import { buildAccountExport } from "./account-data";
import { prisma } from "./db";

/**
 * Loads everything we hold about a user and shapes it for download (GDPR access / portability).
 * Shared by the web route (/api/account/export) and the mobile API (GET /api/v1/me/export).
 * Only ever reads rows of `userId`. Returns null if the user does not exist.
 */
export async function loadAccountExport(userId: string) {
    const productSelect = { barcode: true, name: true, brand: true } as const;
    const [user, profiles, scans, favorites, savedProducts, shoppingList, scanEvents, labelScanUsage, feedbacks, contributions, productsAdded] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, image: true, role: true, createdAt: true,
                weight: true, height: true, dateOfBirth: true, allergies: true, scanInsightsOptIn: true,
            },
        }),
        prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.scanHistory.findMany({
            where: { userId }, orderBy: { scannedAt: "desc" },
            select: { scannedAt: true, product: { select: productSelect } },
        }),
        prisma.favorite.findMany({
            where: { userId }, orderBy: { createdAt: "desc" },
            select: { createdAt: true, product: { select: productSelect } },
        }),
        prisma.savedProduct.findMany({
            where: { userId }, orderBy: { createdAt: "desc" },
            select: { barcode: true, name: true, brand: true, state: true, createdAt: true },
        }),
        prisma.shoppingListItem.findMany({
            where: { userId }, orderBy: { createdAt: "asc" },
            select: { barcode: true, label: true, quantity: true, checked: true, createdAt: true },
        }),
        prisma.scanEvent.findMany({
            where: { userId }, orderBy: { createdAt: "desc" },
            select: {
                barcode: true, score: true, grade: true, sugar100: true, salt100: true, satFat100: true,
                protein100: true, nova: true, category: true, brand: true, profileId: true, createdAt: true,
            },
        }),
        prisma.labelScanUsage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        prisma.productFeedback.findMany({
            where: { userId },
            select: { rating: true, comment: true, createdAt: true, product: { select: { barcode: true, name: true } } },
        }),
        prisma.contribution.findMany({
            where: { userId },
            select: { id: true, status: true, reason: true, changes: true, createdAt: true },
        }),
        prisma.product.findMany({
            where: { createdById: userId },
            select: { barcode: true, name: true, brand: true, status: true, createdAt: true },
        }),
    ]);

    if (!user) return null;

    return buildAccountExport(
        { user, profiles, scans, favorites, savedProducts, shoppingList, scanEvents, labelScanUsage, feedbacks, contributions, productsAdded },
        new Date()
    );
}
