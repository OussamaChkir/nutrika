// F9: what is stored for one scan, and when a scan is a duplicate. Pure.

import type { Product } from "../product";
import { CATEGORY_RULES, getProductCategory } from "../scoring-rules";
import { DEDUPE_WINDOW_MS } from "./rules";

export interface ScanEventData {
    barcode: string;
    score: number;
    grade: string;
    sugar100: number | null;
    salt100: number | null;
    satFat100: number | null;
    protein100: number | null;
    nova: number | null;
    category: string | null;
    brand: string | null;
    highSugar: boolean | null;
    profileId: string | null;
}

const num = (v: number | undefined | null): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** First brand of a comma list ("Nestle, Maggi" -> "Nestle"), trimmed, or null. */
export function primaryBrand(brand: string | null | undefined): string | null {
    const first = (brand ?? "").split(",")[0]?.replace(/\s+/g, " ").trim();
    return first ? first.slice(0, 80) : null;
}

/**
 * The snapshot of a product at scan time. `score` and `grade` are the universal score the user
 * saw. "High sugar" uses the same per-category threshold as the score itself.
 */
export function buildScanEventData(
    product: Product,
    shown: { score: number; grade: string },
    profileId: string | null
): ScanEventData {
    const sugar = num(product.nutrients.sugars);
    const rules = CATEGORY_RULES[getProductCategory(product.categoryTags)];
    const tags = product.categoryTags;
    const nova = typeof product.novaGroup === "number" && product.novaGroup >= 1 && product.novaGroup <= 4 ? product.novaGroup : null;
    return {
        barcode: product.barcode,
        score: Math.round(shown.score),
        grade: shown.grade,
        sugar100: sugar,
        salt100: num(product.nutrients.salt),
        satFat100: num(product.nutrients.saturatedFat),
        protein100: num(product.nutrients.proteins),
        nova,
        category: tags.length > 0 ? tags[tags.length - 1] : null,
        brand: primaryBrand(product.brand),
        highSugar: sugar === null ? null : sugar > rules.sugar.high,
        profileId,
    };
}

/** True when the same product was already recorded a moment ago. */
export function isDuplicateScan(lastRecordedAt: Date | string | number | null | undefined, now: Date | number): boolean {
    if (lastRecordedAt === null || lastRecordedAt === undefined) return false;
    const age = new Date(now).getTime() - new Date(lastRecordedAt).getTime();
    return age >= 0 && age < DEDUPE_WINDOW_MS;
}
