// Product ratings for the mobile API: a star rating only (1 to 5) plus the average. The app can NOT send
// free text, and never receives anyone's comments or names: free text shown to other people is
// user-generated content, which needs filtering, reporting and blocking (App Store 1.2).
// One rating per user per product. Every query is scoped to `userId` where it writes.

import { prisma } from "../db";

export interface FeedbackSummary {
    average: number | null;
    count: number;
    mine: { rating: number } | null;
}

/** Average rounded to one decimal, null when there are no ratings. Pure. */
export function averageRating(ratings: readonly number[]): number | null {
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((a, b) => a + b, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
}

async function productIdFor(barcode: string): Promise<string | null> {
    const product = await prisma.product.findUnique({ where: { barcode }, select: { id: true, status: true } });
    return product && product.status === "APPROVED" ? product.id : null;
}

export async function getFeedbackSummary(userId: string, barcode: string): Promise<FeedbackSummary | null> {
    const productId = await productIdFor(barcode);
    if (!productId) return null;
    const rows = await prisma.productFeedback.findMany({ where: { productId }, select: { userId: true, rating: true } });
    const mine = rows.find((r) => r.userId === userId);
    return {
        average: averageRating(rows.map((r) => r.rating)),
        count: rows.length,
        mine: mine ? { rating: mine.rating } : null,
    };
}

/** Upsert: a second rating from the same user replaces the first. Returns false for an unknown product. */
export async function saveFeedback(userId: string, barcode: string, input: { rating: number }): Promise<boolean> {
    const productId = await productIdFor(barcode);
    if (!productId) return false;
    // Only the rating is written: a comment the user may have left on the website stays as it is.
    await prisma.productFeedback.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId, rating: input.rating, comment: null },
        update: { rating: input.rating },
    });
    return true;
}

export async function deleteFeedback(userId: string, barcode: string): Promise<boolean> {
    const productId = await productIdFor(barcode);
    if (!productId) return false;
    await prisma.productFeedback.deleteMany({ where: { userId, productId } });
    return true;
}
