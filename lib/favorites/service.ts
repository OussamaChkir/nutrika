// Favorites, keyed by user id (mobile API). Favorites point at catalogue products, so the barcode
// is resolved to a product first. Every query is scoped to `userId`.

import { prisma } from "../db";

export interface FavoriteView {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    score: number;
    scoreLetter: string;
    scoreColor: string;
    createdAt: string;
}

export async function listFavoritesFor(userId: string): Promise<FavoriteView[]> {
    const rows = await prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            product: { select: { barcode: true, name: true, brand: true, imageUrl: true, score: true, scoreLetter: true, scoreColor: true } },
        },
    });
    return rows.map((r) => ({
        barcode: r.product.barcode,
        name: r.product.name,
        brand: r.product.brand,
        imageUrl: r.product.imageUrl,
        score: r.product.score,
        scoreLetter: String(r.product.scoreLetter),
        scoreColor: r.product.scoreColor,
        createdAt: r.createdAt.toISOString(),
    }));
}

/** Idempotent: PUT adds (if missing), DELETE removes (if present). Returns false for an unknown product. */
export async function setFavoriteFor(userId: string, barcode: string, on: boolean): Promise<boolean> {
    const product = await prisma.product.findUnique({ where: { barcode }, select: { id: true, status: true } });
    if (!product || product.status !== "APPROVED") return false;

    if (on) {
        await prisma.favorite.upsert({
            where: { userId_productId: { userId, productId: product.id } },
            create: { userId, productId: product.id },
            update: {},
        });
    } else {
        await prisma.favorite.deleteMany({ where: { userId, productId: product.id } });
    }
    return true;
}
