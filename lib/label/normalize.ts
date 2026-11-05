// F5: turn the model's raw answer into the form the user reviews. Pure.
//
// The model is a typist, not an authority: every number is range-checked, per-serving values are
// converted only when the serving size is known, and a value that cannot be true is REMOVED
// (shown empty with a warning), never silently kept.

import {
    NUTRIENT_FIELDS,
    type Extraction,
    type LabelForm,
    type LabelWarning,
    type NutrientField,
    type RawExtraction,
} from "./schema";

/** Confidence below this means "check carefully": the ingredient list is not pre-marked complete. */
export const MIN_CONFIDENCE = 0.7;
/** Sodium (g) to salt (g). */
export const SODIUM_TO_SALT = 2.5;
/** Fat + carbs + protein + fibre + salt per 100 g cannot exceed 100 g; a little slack for rounding. */
const MACRO_SUM_MAX = 105;

const round1 = (n: number) => Math.round(n * 10) / 10;
const MAX: Record<NutrientField, number> = {
    energyKcal: 900, fat: 100, saturatedFat: 100, carbohydrates: 100, sugars: 100, fiber: 100, proteins: 100, salt: 100,
};

type Nutrition = Record<NutrientField, number | null>;

/** Drop values that cannot be true. Returns the cleaned values and which fields were removed. */
export function sanitizeNutrition(input: Nutrition): { nutrition: Nutrition; removed: NutrientField[] } {
    const out: Nutrition = { ...input };
    const removed = new Set<NutrientField>();
    const drop = (f: NutrientField) => {
        if (out[f] !== null) removed.add(f);
        out[f] = null;
    };

    for (const f of NUTRIENT_FIELDS) {
        const v = out[f];
        if (v !== null && (v < 0 || v > MAX[f])) drop(f);
    }
    // Parts cannot exceed the whole.
    if (out.saturatedFat !== null && out.fat !== null && out.saturatedFat > out.fat + 0.1) {
        drop("saturatedFat");
    }
    if (out.sugars !== null && out.carbohydrates !== null && out.sugars > out.carbohydrates + 0.1) {
        drop("sugars");
    }
    // The macros together cannot weigh more than the product.
    const sum = (out.fat ?? 0) + (out.carbohydrates ?? 0) + (out.proteins ?? 0) + (out.fiber ?? 0) + (out.salt ?? 0);
    if (sum > MACRO_SUM_MAX) {
        // Cannot tell which one is wrong: remove all of them so the user retypes them.
        for (const f of ["fat", "carbohydrates", "proteins", "fiber", "salt"] as const) drop(f);
    }
    return { nutrition: out, removed: [...removed] };
}

export function normalizeExtraction(raw: RawExtraction): Extraction {
    const warnings: LabelWarning[] = [];
    const n = raw.nutrition;

    // ----- nutrition basis -----
    let factor = 1;
    let usable = true;
    if (n.basis === "perServing") {
        if (n.servingSizeG !== null && n.servingSizeG > 0 && n.servingSizeG <= 2000) {
            factor = 100 / n.servingSizeG;
            warnings.push({ code: "perServingConverted" });
        } else {
            usable = false;
            warnings.push({ code: "perServingNoSize" });
        }
    } else if (n.basis === "unknown") {
        warnings.push({ code: "basisUnknown" });
    }

    const scale = (v: number | null) => (usable && v !== null ? round1(v * factor) : null);
    let salt = scale(n.salt);
    if (salt === null && usable && n.sodium !== null) {
        salt = round1(n.sodium * factor * SODIUM_TO_SALT);
        warnings.push({ code: "saltFromSodium" });
    }

    const { nutrition, removed } = sanitizeNutrition({
        energyKcal: usable && n.energyKcal !== null ? Math.round(n.energyKcal * factor) : null,
        fat: scale(n.fat),
        saturatedFat: scale(n.saturatedFat),
        carbohydrates: scale(n.carbohydrates),
        sugars: scale(n.sugars),
        fiber: scale(n.fiber),
        proteins: scale(n.proteins),
        salt,
    });
    for (const field of removed) warnings.push({ code: "valueRemoved", field });

    // ----- reliability -----
    if (raw.readable === "unreadable") warnings.push({ code: "unreadable" });
    else if (raw.readable === "partial") warnings.push({ code: "partial" });
    if (raw.confidence < MIN_CONFIDENCE) warnings.push({ code: "lowConfidence" });
    if (!raw.ingredientsText) warnings.push({ code: "noIngredients" });

    const trustworthy = raw.readable === "good" && raw.confidence >= MIN_CONFIDENCE && raw.ingredientsComplete;
    const form: LabelForm = {
        productName: raw.productName ?? "",
        brand: raw.brand ?? "",
        // A per-100 ml table means a drink, whatever the model guessed.
        kind: n.basis === "per100ml" ? "drink" : raw.kind,
        ingredientsText: raw.ingredientsText ?? "",
        // Never pre-marked complete unless the photo was clearly readable AND the model saw the whole list.
        ingredientsComplete: Boolean(raw.ingredientsText) && trustworthy,
        allergensContains: raw.allergensContains,
        allergensMayContain: raw.allergensMayContain,
        nutrition,
    };

    return { form, warnings, confidence: raw.confidence, readable: raw.readable, language: raw.language };
}
