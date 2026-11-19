// Product search: Open Food Facts first, then our own catalogue. Shared by GET /api/search (web)
// and GET /api/v1/products/search (mobile).

import { prisma } from "../db";
import { getProductImage, getProductName, searchProducts } from "../openfoodfacts";

export interface SearchResult {
    barcode: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    source: "openfoodfacts" | "database";
    score?: number;
    scoreLetter?: string;
}

export const SORTS = ["name_asc", "name_desc", "score_asc", "score_desc"] as const;
export type SearchSort = (typeof SORTS)[number];

export const MIN_QUERY_LENGTH = 2;
const LETTERS = ["A", "B", "C", "D", "E"];

export function sortResults(results: SearchResult[], sort: string | null | undefined): SearchResult[] {
    if (!sort) return results;
    const sorted = [...results];
    sorted.sort((a, b) => {
        switch (sort) {
            case "name_asc":
                return a.name.localeCompare(b.name);
            case "name_desc":
                return b.name.localeCompare(a.name);
            case "score_asc":
                return (a.score ?? 50) - (b.score ?? 50);
            case "score_desc":
                return (b.score ?? 50) - (a.score ?? 50);
            default:
                return 0;
        }
    });
    return sorted;
}

export async function searchCatalog(input: { query: string; scoreLetter?: string | null; sort?: string | null }): Promise<SearchResult[]> {
    const query = input.query.trim();
    const letter = input.scoreLetter && LETTERS.includes(input.scoreLetter) ? input.scoreLetter : null;
    const results: SearchResult[] = [];

    // 1. Open Food Facts first
    const offResults = await searchProducts(query, 1, 10);
    if (offResults && offResults.products.length > 0) {
        for (const product of offResults.products) {
            const grade = product.nutriscore_grade?.toUpperCase();
            results.push({
                barcode: product.code,
                name: getProductName(product),
                brand: product.brands || undefined,
                imageUrl: getProductImage(product) || undefined,
                source: "openfoodfacts",
                scoreLetter: grade || undefined,
            });
        }
    }

    // 2. Also our own catalogue (approved products only)
    const dbWhere: Record<string, unknown> = {
        OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query } },
        ],
        status: "APPROVED",
    };
    if (letter) dbWhere.scoreLetter = letter;

    const dbProducts = await prisma.product.findMany({
        where: dbWhere,
        take: 10,
        select: { barcode: true, name: true, brand: true, imageUrl: true, score: true, scoreLetter: true },
    });

    const existingBarcodes = new Set(results.map((r) => r.barcode));
    for (const product of dbProducts) {
        if (!existingBarcodes.has(product.barcode)) {
            results.push({
                barcode: product.barcode,
                name: product.name,
                brand: product.brand || undefined,
                imageUrl: product.imageUrl || undefined,
                source: "database",
                score: product.score,
                scoreLetter: String(product.scoreLetter),
            });
        }
    }

    // 3. Score letter filter on the combined list (Open Food Facts results are filtered here)
    const filtered = letter ? results.filter((r) => r.scoreLetter?.toUpperCase() === letter) : results;

    // 4. Sort
    return sortResults(filtered, input.sort);
}
