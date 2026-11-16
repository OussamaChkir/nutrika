// F3: "this version has more sugar than the one you usually buy". Pure.
//
// "Usual" = the products the user approved in the same category (most specific category tag),
// not counting the scanned one. With several, the median is used, so one odd product does not
// decide. Scan history cannot say "usually": it keeps one row per product with no counts.
// A difference only counts when it is both relative (25%) and absolute (same sizes as F2).

export const COMPARED_NUTRIENTS = ["sugars", "salt", "saturatedFat"] as const;
export type ComparedNutrient = (typeof COMPARED_NUTRIENTS)[number];

/** Minimum absolute difference, in g per 100 g (or 100 ml). */
export const MIN_ABS_DIFF: Record<ComparedNutrient, number> = { sugars: 3, salt: 0.3, saturatedFat: 1.5 };
/** Minimum relative difference. */
export const MIN_REL_DIFF = 0.25;

export interface Comparable {
    barcode: string;
    category: string | null;
    sugars?: number | null;
    salt?: number | null;
    saturatedFat?: number | null;
}

export interface UsualComparison {
    nutrient: ComparedNutrient;
    current: number;
    usual: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Nutrients where the scanned product is clearly higher than the user's usual one. */
export function compareWithUsual(current: Comparable, approved: readonly Comparable[]): UsualComparison[] {
    if (!current.category) return [];
    const peers = approved.filter((p) => p.category === current.category && p.barcode !== current.barcode);
    if (peers.length === 0) return [];

    const out: UsualComparison[] = [];
    for (const nutrient of COMPARED_NUTRIENTS) {
        const now = current[nutrient];
        const known = peers.map((p) => p[nutrient]).filter(isNum);
        if (!isNum(now) || known.length === 0) continue;
        const usual = median(known);
        const diff = now - usual;
        if (diff >= MIN_ABS_DIFF[nutrient] && (usual === 0 || diff / usual >= MIN_REL_DIFF)) {
            out.push({ nutrient, current: round1(now), usual: round1(usual) });
        }
    }
    return out;
}
