// F5: score how well label reading matches a human-typed answer. Pure.
//
// Used by the opt-in live test (eval.live.test.ts) that the owner runs on ~30 real labels with
// their own Gemini key. The roadmap bar: nutrition values right on at least 85% of labels, and
// NO label where an allergen printed on the package is missing from the result.

import type { LabelForm, NutrientField } from "./schema";
import { NUTRIENT_FIELDS } from "./schema";

/** What a person typed from the package. Everything is optional: only what is present is checked. */
export interface Expected {
    allergensContains?: string[];
    allergensMayContain?: string[];
    ingredientsText?: string;
    nutrition?: Partial<Record<NutrientField, number | null>>;
}

export interface CaseResult {
    name: string;
    /** Nutrient fields compared, and how many were right. */
    nutrientsChecked: number;
    nutrientsRight: number;
    wrongNutrients: NutrientField[];
    /** Expected allergens that do not appear anywhere in the result (contains, may contain or ingredient text). */
    missedAllergens: string[];
    /** 0..1 share of expected ingredient words that were read (null when not checked). */
    ingredientRecall: number | null;
    /** The dangerous case: an allergen was missed AND the list was pre-marked complete. */
    criticalMiss: boolean;
}

export const NUTRIENT_TOLERANCE_ABS = 0.2;
export const NUTRIENT_TOLERANCE_REL = 0.05;

export const nutrientMatches = (expected: number, actual: number | null): boolean =>
    actual !== null && Math.abs(expected - actual) <= Math.max(NUTRIENT_TOLERANCE_ABS, Math.abs(expected) * NUTRIENT_TOLERANCE_REL);

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

export function compareCase(name: string, expected: Expected, actual: LabelForm): CaseResult {
    const wrongNutrients: NutrientField[] = [];
    let checked = 0;
    for (const field of NUTRIENT_FIELDS) {
        const want = expected.nutrition?.[field];
        if (want === undefined) continue;
        checked++;
        const got = actual.nutrition[field];
        const right = want === null ? got === null : nutrientMatches(want, got);
        if (!right) wrongNutrients.push(field);
    }

    const haystack = fold([...actual.allergensContains, ...actual.allergensMayContain, actual.ingredientsText].join(" | "));
    const missed = [...(expected.allergensContains ?? []), ...(expected.allergensMayContain ?? [])].filter((a) => !haystack.includes(fold(a)));

    let recall: number | null = null;
    if (expected.ingredientsText) {
        const want = [...new Set(words(expected.ingredientsText))];
        const have = new Set(words(actual.ingredientsText));
        recall = want.length === 0 ? 1 : want.filter((w) => have.has(w)).length / want.length;
    }

    return {
        name,
        nutrientsChecked: checked,
        nutrientsRight: checked - wrongNutrients.length,
        wrongNutrients,
        missedAllergens: missed,
        ingredientRecall: recall,
        criticalMiss: missed.length > 0 && actual.ingredientsComplete,
    };
}

export interface Summary {
    cases: number;
    /** Share of labels whose checked nutrients were ALL right. */
    nutritionAllRightShare: number;
    /** Share of individual nutrient values that were right. */
    nutrientValueShare: number;
    labelsWithMissedAllergen: number;
    criticalMisses: number;
    meanIngredientRecall: number | null;
    passes: boolean;
}

/** Roadmap bar: nutrition right on >= 85% of labels, and no label with a missed allergen. */
export function summarize(results: CaseResult[]): Summary {
    const withNutrition = results.filter((r) => r.nutrientsChecked > 0);
    const allRight = withNutrition.filter((r) => r.wrongNutrients.length === 0).length;
    const valuesChecked = withNutrition.reduce((n, r) => n + r.nutrientsChecked, 0);
    const valuesRight = withNutrition.reduce((n, r) => n + r.nutrientsRight, 0);
    const recalls = results.flatMap((r) => (r.ingredientRecall === null ? [] : [r.ingredientRecall]));
    const missed = results.filter((r) => r.missedAllergens.length > 0).length;
    const nutritionAllRightShare = withNutrition.length === 0 ? 0 : allRight / withNutrition.length;
    return {
        cases: results.length,
        nutritionAllRightShare,
        nutrientValueShare: valuesChecked === 0 ? 0 : valuesRight / valuesChecked,
        labelsWithMissedAllergen: missed,
        criticalMisses: results.filter((r) => r.criticalMiss).length,
        meanIngredientRecall: recalls.length === 0 ? null : recalls.reduce((a, b) => a + b, 0) / recalls.length,
        passes: results.length > 0 && nutritionAllRightShare >= 0.85 && missed === 0,
    };
}
