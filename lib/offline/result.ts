// F8: turn a product kept on the device into a full verdict, with the same engines as the server.
// Pure: no I/O. `scoreProduct` and `evaluateProduct` are the SAME functions the product page uses,
// so an offline verdict cannot differ from an online one for the same data and profile.

import { evaluateProduct, type PersonalVerdict } from "../profiles/evaluate";
import { scoreProduct, type ScoreResult } from "../scoring";
import type { ProductNutrients } from "../product";
import { describeAge, type Age, type CachedProduct, type ProfileSnapshot } from "./policy";

export interface OfflineResult {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    nutrients: ProductNutrients;
    score: ScoreResult;
    verdicts: { id: string; name: string; verdict: PersonalVerdict }[];
    activeId: string | null;
    age: Age;
    /** The ingredient list is missing or flagged incomplete: allergens cannot be verified. */
    ingredientsUnverified: boolean;
}

export function buildOfflineResult(cached: CachedProduct, profiles: readonly ProfileSnapshot[], activeId: string | null, now: number): OfflineResult {
    const score = scoreProduct(cached.product);
    return {
        barcode: cached.barcode,
        name: cached.product.name,
        brand: cached.product.brand,
        imageUrl: cached.product.imageUrl,
        nutrients: cached.product.nutrients,
        score,
        verdicts: profiles.map((p) => ({ id: p.id, name: p.name, verdict: evaluateProduct(cached.product, p.profile, score.score) })),
        activeId: activeId && profiles.some((p) => p.id === activeId) ? activeId : (profiles[0]?.id ?? null),
        age: describeAge(cached.fetchedAt, now),
        ingredientsUnverified: cached.product.ingredientsStatus !== "usable",
    };
}
