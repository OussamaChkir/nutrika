// Personal verdict: the same product judged for ONE profile.
//
// Design (see the F1 and F7 pages in the Notion hub):
//  - The universal score (lib/scoring.ts) is untouched. The personal score is that score plus
//    the adjustments of the rules that apply to this profile, clamped to 0-100.
//  - Rules are data (`RULES`) plus pure functions. No I/O, so this can run on the server, in the
//    browser and offline.
//  - Every rule returns reasons with a level: block, caution, good or unknown.
//    Any `block` caps the score and makes the status "not_suitable".
//  - SAFETY INVARIANT (F7): for a profile with allergies, missing or incomplete ingredient data
//    is NEVER reported as suitable. Unknown is not green. tests pin this.
//  - Wording is factual ("high salt"), never "this will harm you". Reasons carry message keys
//    and parameters, the UI translates them.

import { findAllergenMatches, type AllergyOption } from "../allergens";
import type { IngredientsStatus, Product } from "../product";
import { CATEGORY_RULES, getProductCategory } from "../scoring-rules";
import { detectAllergensInText, textMatchesAllergy } from "./allergen-text";
import type { Condition, Diet, Goal, PersonalProfile } from "./constants";

// ============================================
// TYPES
// ============================================

export type ReasonLevel = "block" | "caution" | "good" | "unknown";

export type ReasonBecause = "allergy" | Condition | Diet | Goal;

export interface PersonalReason {
    level: ReasonLevel;
    /** Message key under the `PersonalScore.reasons` i18n namespace. */
    key: string;
    params?: Record<string, string | number>;
    /** Set on allergen reasons, so the UI can show the localized allergen name. */
    allergen?: AllergyOption;
    /** Which part of the profile caused this reason. */
    because: ReasonBecause;
    /** Points added to the universal score (negative = removed). Ignored for `block`. */
    delta: number;
}

/** What the allergen check concluded, across all of the profile's allergies. */
export type AllergenState =
    | "not_applicable" // the profile lists no allergy
    | "contains"
    | "may_contain"
    | "unknown" // data missing or incomplete: cannot say
    | "none_found"; // complete data and no declared allergen from the profile's list

export type VerdictStatus =
    | "not_suitable"
    | "caution"
    | "cannot_verify"
    | "good_match"
    | "neutral"; // nothing in the profile could be judged

export interface AllergenFinding {
    allergen: AllergyOption;
    kind: "contains" | "may_contain";
    /** Where it was found: Open Food Facts allergen tags, or the ingredients text. */
    source: "tag" | "text";
}

export interface PersonalVerdict {
    status: VerdictStatus;
    /** Universal score adjusted for the profile. `null` when allergens cannot be verified. */
    personalScore: number | null;
    universalScore: number;
    reasons: PersonalReason[];
    allergenState: AllergenState;
    allergenFindings: AllergenFinding[];
    dataCompleteness: IngredientsStatus;
    /** Last edit of the product data, unix seconds. */
    lastModified?: number;
}

interface RuleContext {
    product: Product;
    profile: PersonalProfile;
    /** "100 g" for foods, "100 ml" for drinks. Used in messages. */
    unit: "100 g" | "100 ml";
}

interface RuleOutput {
    reasons: PersonalReason[];
    allergenState?: AllergenState;
    allergenFindings?: AllergenFinding[];
}

interface Rule {
    id: string;
    applies: (profile: PersonalProfile) => boolean;
    evaluate: (ctx: RuleContext) => RuleOutput;
}

// ============================================
// CONSTANTS (the numbers a dietitian would review)
// ============================================

/** A "not suitable" verdict can never score above this. */
export const BLOCK_SCORE_CAP = 20;

const SALT_HIGH = 1.5; // g per 100 g
const SALT_LOW = 0.3;
const NET_CARBS_HIGH = 10; // g per 100 g
const NET_CARBS_LOW = 5;
const PROTEIN_GOOD = 10; // g per 100 g
const ENERGY_DENSE_KCAL = 400; // kcal per 100 g
const KJ_PER_KCAL = 4.184;

const DELTA = {
    cautionStrong: -20,
    caution: -10,
    goodSmall: 3,
    good: 5,
    goodStrong: 8,
} as const;

const value = (n: number) => n.toFixed(1);

// ============================================
// RULES
// ============================================

const allergenRule: Rule = {
    id: "allergens",
    applies: (profile) => profile.allergens.length > 0,
    evaluate: ({ product, profile }) => {
        const reasons: PersonalReason[] = [];
        const findings: AllergenFinding[] = [];

        const tagMatches = findAllergenMatches(profile.allergens, [
            ...product.allergens,
            ...product.traces.map((t) => `may contain ${t}`),
        ]);
        const text = detectAllergensInText(product.ingredientsText);
        const usable = product.ingredientsStatus === "usable";

        let sawUnverified = false;
        let sawLactoseFree = false;

        for (const allergen of profile.allergens) {
            // Lactose intolerance is not a milk allergy: a lactose-free label settles it.
            if (allergen === "Lactose" && product.labels.lactoseFree) {
                sawLactoseFree = true;
                continue;
            }

            const containsTag = tagMatches.some((m) => m.allergy === allergen && !m.trace);
            const traceTag = tagMatches.some((m) => m.allergy === allergen && m.trace);
            const containsText = textMatchesAllergy(allergen, text.contains);
            const traceText = textMatchesAllergy(allergen, text.traces);

            if (containsTag || containsText) {
                findings.push({ allergen, kind: "contains", source: containsTag ? "tag" : "text" });
            } else if (traceTag || traceText) {
                findings.push({ allergen, kind: "may_contain", source: traceTag ? "tag" : "text" });
            } else if (!usable) {
                sawUnverified = true;
            }
        }

        for (const f of findings) {
            if (f.kind === "contains") {
                reasons.push({
                    level: "block",
                    key: f.source === "tag" ? "allergenContains" : "allergenContainsText",
                    allergen: f.allergen,
                    because: "allergy",
                    delta: 0,
                });
            } else {
                const strict = profile.allergenStrictness === "avoid_traces";
                reasons.push({
                    level: strict ? "block" : "caution",
                    key: "allergenMayContain",
                    allergen: f.allergen,
                    because: "allergy",
                    delta: strict ? 0 : DELTA.caution,
                });
            }
        }

        if (sawUnverified) {
            reasons.push({ level: "unknown", key: "allergenUnknown", because: "allergy", delta: 0 });
        }
        if (sawLactoseFree) {
            reasons.push({ level: "good", key: "lactoseFree", because: "allergy", delta: DELTA.good });
        }

        let allergenState: AllergenState;
        if (findings.some((f) => f.kind === "contains")) allergenState = "contains";
        else if (findings.some((f) => f.kind === "may_contain")) allergenState = "may_contain";
        else if (sawUnverified) allergenState = "unknown";
        else allergenState = "none_found";

        // "None found" is only worth saying when every allergy was actually checked on usable data.
        if (allergenState === "none_found" && usable) {
            reasons.push({ level: "good", key: "allergenNone", because: "allergy", delta: DELTA.good });
        }

        return { reasons, allergenState, allergenFindings: findings };
    },
};

function veganRule(): Rule {
    return {
        id: "vegan",
        applies: (p) => p.diets.includes("vegan"),
        evaluate: ({ product }) => {
            const tags = product.ingredientsAnalysisTags;
            if (tags.includes("en:non-vegan")) {
                return { reasons: [{ level: "block", key: "notVegan", because: "vegan", delta: 0 }] };
            }
            if (tags.includes("en:vegan") || product.labels.vegan) {
                return { reasons: [{ level: "good", key: "veganOk", because: "vegan", delta: DELTA.good }] };
            }
            return { reasons: [{ level: "unknown", key: "veganUnknown", because: "vegan", delta: 0 }] };
        },
    };
}

function vegetarianRule(): Rule {
    return {
        id: "vegetarian",
        // Vegan already covers vegetarian.
        applies: (p) => p.diets.includes("vegetarian") && !p.diets.includes("vegan"),
        evaluate: ({ product }) => {
            const tags = product.ingredientsAnalysisTags;
            if (tags.includes("en:non-vegetarian")) {
                return { reasons: [{ level: "block", key: "notVegetarian", because: "vegetarian", delta: 0 }] };
            }
            if (
                tags.includes("en:vegetarian") ||
                tags.includes("en:vegan") ||
                product.labels.vegetarian ||
                product.labels.vegan
            ) {
                return {
                    reasons: [{ level: "good", key: "vegetarianOk", because: "vegetarian", delta: DELTA.good }],
                };
            }
            return { reasons: [{ level: "unknown", key: "vegetarianUnknown", because: "vegetarian", delta: 0 }] };
        },
    };
}

const sodiumRule: Rule = {
    id: "sodium",
    applies: (p) => p.conditions.includes("hypertension") || p.diets.includes("low_sodium"),
    evaluate: ({ product, profile, unit }) => {
        const because: ReasonBecause = profile.conditions.includes("hypertension") ? "hypertension" : "low_sodium";
        const { salt, sodium } = product.nutrients;
        const g = salt ?? (sodium !== undefined ? sodium * 2.5 : undefined);
        if (g === undefined) {
            return { reasons: [{ level: "unknown", key: "saltUnknown", because, delta: 0 }] };
        }
        if (g > SALT_HIGH) {
            return {
                reasons: [
                    { level: "caution", key: "saltHigh", params: { value: value(g), unit }, because, delta: DELTA.caution },
                ],
            };
        }
        if (g < SALT_LOW) {
            return {
                reasons: [
                    { level: "good", key: "saltLow", params: { value: value(g), unit }, because, delta: DELTA.good },
                ],
            };
        }
        return { reasons: [] };
    },
};

const diabetesRule: Rule = {
    id: "sugar",
    applies: (p) => p.conditions.includes("diabetes"),
    evaluate: ({ product, unit }) => {
        const sugar = product.nutrients.sugars;
        if (sugar === undefined) {
            return { reasons: [{ level: "unknown", key: "sugarUnknown", because: "diabetes", delta: 0 }] };
        }
        // Same category-aware thresholds as the universal score (a drink is judged per 100 ml).
        const t = CATEGORY_RULES[getProductCategory(product.categoryTags)].sugar;
        const params = { value: value(sugar), unit };
        if (sugar > t.veryHigh) {
            return {
                reasons: [{ level: "caution", key: "sugarVeryHigh", params, because: "diabetes", delta: DELTA.cautionStrong }],
            };
        }
        if (sugar > t.high) {
            return {
                reasons: [{ level: "caution", key: "sugarHigh", params, because: "diabetes", delta: DELTA.caution }],
            };
        }
        if (sugar < t.low) {
            return {
                reasons: [{ level: "good", key: "sugarLow", params, because: "diabetes", delta: DELTA.goodSmall }],
            };
        }
        return { reasons: [] };
    },
};

const ketoRule: Rule = {
    id: "keto",
    applies: (p) => p.diets.includes("keto"),
    evaluate: ({ product, unit }) => {
        const { carbohydrates, fiber } = product.nutrients;
        if (carbohydrates === undefined) {
            return { reasons: [{ level: "unknown", key: "carbsUnknown", because: "keto", delta: 0 }] };
        }
        // Unknown fiber is treated as zero: the stricter reading.
        const net = Math.max(0, carbohydrates - (fiber ?? 0));
        const params = { value: value(net), unit };
        if (net > NET_CARBS_HIGH) {
            return { reasons: [{ level: "caution", key: "netCarbsHigh", params, because: "keto", delta: DELTA.caution }] };
        }
        if (net <= NET_CARBS_LOW) {
            return { reasons: [{ level: "good", key: "netCarbsLow", params, because: "keto", delta: DELTA.good }] };
        }
        return { reasons: [] };
    },
};

const muscleGainRule: Rule = {
    id: "protein",
    applies: (p) => p.goals.includes("muscle_gain"),
    evaluate: ({ product, unit }) => {
        const protein = product.nutrients.proteins;
        if (protein !== undefined && protein > PROTEIN_GOOD) {
            return {
                reasons: [
                    {
                        level: "good",
                        key: "proteinGood",
                        params: { value: value(protein), unit },
                        because: "muscle_gain",
                        delta: DELTA.goodStrong,
                    },
                ],
            };
        }
        return { reasons: [] };
    },
};

const weightLossRule: Rule = {
    id: "energy",
    applies: (p) => p.goals.includes("weight_loss"),
    evaluate: ({ product }) => {
        const n = product.nutrients;
        const kcal = n.energyKcal ?? (n.energyKj !== undefined ? n.energyKj / KJ_PER_KCAL : undefined);
        if (kcal === undefined || kcal <= ENERGY_DENSE_KCAL) return { reasons: [] };

        const rules = CATEGORY_RULES[getProductCategory(product.categoryTags)];
        const sugarHigh = n.sugars !== undefined && n.sugars > rules.sugar.high;
        const satFatHigh =
            rules.saturatedFat.kind === "absolute" &&
            n.saturatedFat !== undefined &&
            n.saturatedFat > rules.saturatedFat.high;
        if (!sugarHigh && !satFatHigh) return { reasons: [] };

        return {
            reasons: [
                {
                    level: "caution",
                    key: "energyDense",
                    params: { value: Math.round(kcal) },
                    because: "weight_loss",
                    delta: DELTA.caution,
                },
            ],
        };
    },
};

/** One entry per judgement. Add a rule here, with tests, to support a new profile choice. */
export const RULES: readonly Rule[] = [
    allergenRule,
    veganRule(),
    vegetarianRule(),
    sodiumRule,
    diabetesRule,
    ketoRule,
    muscleGainRule,
    weightLossRule,
];

// ============================================
// EVALUATION
// ============================================

/**
 * Judge a product for a profile.
 * @param universalScore the product's universal score (0-100) as shown to everyone
 */
export function evaluateProduct(
    product: Product,
    profile: PersonalProfile,
    universalScore: number
): PersonalVerdict {
    const category = getProductCategory(product.categoryTags);
    const unit = CATEGORY_RULES[category].sugarUnit === "100ml" ? "100 ml" : "100 g";
    const ctx: RuleContext = { product, profile, unit };

    const reasons: PersonalReason[] = [];
    let allergenState: AllergenState = "not_applicable";
    let allergenFindings: AllergenFinding[] = [];

    for (const rule of RULES) {
        if (!rule.applies(profile)) continue;
        const out = rule.evaluate(ctx);
        reasons.push(...out.reasons);
        if (out.allergenState) allergenState = out.allergenState;
        if (out.allergenFindings) allergenFindings = out.allergenFindings;
    }

    const has = (level: ReasonLevel) => reasons.some((r) => r.level === level);

    let status: VerdictStatus;
    if (has("block")) status = "not_suitable";
    else if (has("caution")) status = "caution";
    else if (has("unknown")) status = "cannot_verify";
    else if (has("good")) status = "good_match";
    else status = "neutral";

    let personalScore: number | null = null;
    if (allergenState !== "unknown") {
        const adjusted = universalScore + reasons.reduce((sum, r) => sum + (r.level === "block" ? 0 : r.delta), 0);
        personalScore = Math.max(0, Math.min(100, Math.round(adjusted)));
        if (status === "not_suitable") personalScore = Math.min(personalScore, BLOCK_SCORE_CAP);
    }

    return {
        status,
        personalScore,
        universalScore,
        reasons,
        allergenState,
        allergenFindings,
        dataCompleteness: product.ingredientsStatus,
        lastModified: product.lastModified,
    };
}
