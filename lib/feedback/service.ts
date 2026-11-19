// Product ratings for the mobile API: the user's own rating plus the average, never other people's
// comments or names (user-generated content in a store app needs reporting and blocking, App Store 1.2).
// One rating per user per product. Every query is scoped to `userId` where it writes.

import { prisma } from "../db";

export interface FeedbackSummary {
    average: number | null;
    count: number;
    mine: { rating: number; comment: string | null } | null;
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
    const rows = await prisma.productFeedback.findMany({ where: { productId }, select: { userId: true, rating: true, comment: true } });
    const mine = rows.find((r) => r.userId === userId);
    return {
        average: averageRating(rows.map((r) => r.rating)),
        count: rows.length,
        mine: mine ? { rating: mine.rating, comment: mine.comment } : null,
    };
}

/** Upsert: a second rating from the same user replaces the first. Returns false for an unknown product. */
export async function saveFeedback(userId: string, barcode: string, input: { rating: number; comment?: string | null }): Promise<boolean> {
    const productId = await productIdFor(barcode);
    if (!productId) return false;
    const data = { rating: input.rating, comment: input.comment?.trim() || null };
    await prisma.productFeedback.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId, ...data },
        update: data,
    });
    return true;
}

export async function deleteFeedback(userId: string, barcode: string): Promise<boolean> {
    const productId = await productIdFor(barcode);
    if (!productId) return false;
    await prisma.productFeedback.deleteMany({ where: { userId, productId } });
    return true;
}
