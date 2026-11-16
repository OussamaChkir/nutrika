// Category-aware scoring rules.
//
// The general thresholds were designed for solid foods per 100 g. They misjudge three
// families, so those get their own rules (same idea as Nutri-Score, which also treats
// beverages, fats/oils and cheese separately):
//
//   - beverages: 8 g of sugar per 100 ml is a lot for a drink, almost nothing for a snack.
//   - fats and oils: every oil is ~100 % fat, so an absolute saturated-fat limit penalises
//     olive oil exactly like butter. What matters is the share of saturated fat.
//   - cheese: cheese is NOVA 3 by definition, so the "processed food" penalty carries no
//     information for it.
//
// PRODUCT DECISION: the numbers below are a first proposal. They are all in this one table,
// so changing a threshold is a one-line edit; lib/scoring.test.ts pins the current values.
//
// Pure module: no I/O.

export type ProductCategory = "general" | "beverage" | "fatOil" | "cheese";

export interface SugarRules {
    /** Above this: strong penalty (-20). */
    veryHigh: number;
    /** Above this: moderate penalty (-10). */
    high: number;
    /** Below this: small bonus (+3). */
    low: number;
}

export type SaturatedFatRules =
    /** Absolute grams per 100 g: penalty above `high`, bonus below `low`. */
    | { kind: "absolute"; high: number; low: number }
    /** Share of saturated fat in total fat (0-1): penalty above `highShare`, no bonus. */
    | { kind: "shareOfFat"; highShare: number; penalty: number };

export interface CategoryRules {
    /** Unit shown with sugar values in messages. */
    sugarUnit: "100g" | "100ml";
    sugar: SugarRules;
    saturatedFat: SaturatedFatRules;
    salt: { high: number; low: number };
    /** Points removed for NOVA 3. */
    nova3Penalty: number;
}

const GENERAL_RULES: CategoryRules = {
    sugarUnit: "100g",
    sugar: { veryHigh: 22.5, high: 10, low: 5 },
    saturatedFat: { kind: "absolute", high: 5, low: 1.5 },
    salt: { high: 1.5, low: 0.3 },
    nova3Penalty: 5,
};

export const CATEGORY_RULES: Record<ProductCategory, CategoryRules> = {
    general: GENERAL_RULES,
    beverage: {
        ...GENERAL_RULES,
        sugarUnit: "100ml",
        // Cola (~10.6 g/100 ml) and 100 % fruit juice (~9 g) land in "very high";
        // lightly sweetened tea (~4-5 g) lands in "high"; water and diet drinks get the bonus.
        sugar: { veryHigh: 6.5, high: 2.5, low: 0.5 },
    },
    fatOil: {
        ...GENERAL_RULES,
        // Olive / rapeseed / sunflower oil: ~10-15 % saturated -> no penalty.
        // Butter (~63 %), palm oil (~50 %), coconut oil (~87 %) -> penalty.
        saturatedFat: { kind: "shareOfFat", highShare: 0.45, penalty: 15 },
    },
    cheese: {
        ...GENERAL_RULES,
        nova3Penalty: 0,
    },
};

// Open Food Facts category tags (the app reads `categories_tags`, all ancestors included).
const CHEESE_TAGS = ["en:cheeses"];
const FAT_OIL_TAGS = [
    "en:fats",
    "en:vegetable-fats",
    "en:vegetable-oils",
    "en:vegetable-oils-and-fats",
    "en:oils-and-fats",
    "en:olive-oils",
    "en:animal-fats",
    "en:butters",
    "en:margarines",
];
const BEVERAGE_TAGS = ["en:beverages"];
// Plain milk is a drink, but its sugar is natural lactose, not added sugar: score it as a food.
const NOT_A_BEVERAGE_TAGS = ["en:milks"];

function hasAny(tags: readonly string[], wanted: readonly string[]): boolean {
    return wanted.some((tag) => tags.includes(tag));
}

/** Pick the scoring category from OFF category tags. Order: cheese, fats/oils, beverage. */
export function getProductCategory(categoryTags: readonly string[]): ProductCategory {
    const tags = categoryTags.map((t) => t.toLowerCase());
    if (hasAny(tags, CHEESE_TAGS)) return "cheese";
    if (hasAny(tags, FAT_OIL_TAGS)) return "fatOil";
    if (hasAny(tags, BEVERAGE_TAGS) && !hasAny(tags, NOT_A_BEVERAGE_TAGS)) return "beverage";
    return "general";
}
