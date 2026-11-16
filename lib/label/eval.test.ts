import { describe, expect, it } from "vitest";

import { compareCase, nutrientMatches, summarize } from "./eval";
import type { LabelForm } from "./schema";

const actual = (over: Partial<LabelForm> = {}, nut: Partial<LabelForm["nutrition"]> = {}): LabelForm => ({
    productName: "",
    brand: "",
    kind: "food",
    ingredientsText: "Farine de blé, sucre, lait écrémé en poudre",
    ingredientsComplete: true,
    allergensContains: ["gluten", "lait"],
    allergensMayContain: [],
    nutrition: { energyKcal: 450, fat: 18, saturatedFat: 8, carbohydrates: 62, sugars: 25, fiber: 2, proteins: 6, salt: 0.6, ...nut },
    ...over,
});

describe("nutrientMatches", () => {
    it("allows a small absolute or 5% relative difference", () => {
        expect(nutrientMatches(0.6, 0.7)).toBe(true);
        expect(nutrientMatches(450, 470)).toBe(true); // 5% of 450 = 22.5
        expect(nutrientMatches(450, 500)).toBe(false);
        expect(nutrientMatches(25, 52)).toBe(false); // a swapped digit
        expect(nutrientMatches(5, null)).toBe(false);
    });
});

describe("compareCase", () => {
    it("counts right and wrong nutrients, and ignores fields that were not typed", () => {
        const r = compareCase("a", { nutrition: { sugars: 25, salt: 0.6, fat: 30 } }, actual());
        expect(r.nutrientsChecked).toBe(3);
        expect(r.wrongNutrients).toEqual(["fat"]);
    });

    it("a nutrient typed as null must be absent in the result", () => {
        expect(compareCase("a", { nutrition: { fiber: null } }, actual({}, { fiber: null })).wrongNutrients).toEqual([]);
        expect(compareCase("a", { nutrition: { fiber: null } }, actual()).wrongNutrients).toEqual(["fiber"]);
    });

    it("finds allergens in any field, ignoring case and accents", () => {
        const r = compareCase("a", { allergensContains: ["Blé", "LAIT"] }, actual());
        expect(r.missedAllergens).toEqual([]);
    });

    it("flags a missed allergen, and a CRITICAL miss when the list was marked complete", () => {
        const complete = compareCase("a", { allergensMayContain: ["arachides"] }, actual());
        expect(complete.missedAllergens).toEqual(["arachides"]);
        expect(complete.criticalMiss).toBe(true);
        const incomplete = compareCase("a", { allergensMayContain: ["arachides"] }, actual({ ingredientsComplete: false }));
        expect(incomplete.criticalMiss).toBe(false);
    });

    it("measures ingredient recall", () => {
        const r = compareCase("a", { ingredientsText: "Farine de blé, sucre, beurre" }, actual());
        expect(r.ingredientRecall).toBeCloseTo(3 / 4); // farine, ble, sucre, beurre -> 3 of 4 found
    });
});

describe("summarize", () => {
    const good = compareCase("good", { nutrition: { sugars: 25 }, allergensContains: ["lait"] }, actual());
    const badNutrition = compareCase("bad", { nutrition: { sugars: 5 } }, actual());
    const missed = compareCase("missed", { nutrition: { sugars: 25 }, allergensMayContain: ["soja"] }, actual());

    it("passes only with 85% nutrition right and zero missed allergens", () => {
        const ok = summarize(Array.from({ length: 20 }, (_, i) => ({ ...good, name: String(i) })));
        expect(ok.passes).toBe(true);
        const oneBad = summarize([...Array.from({ length: 6 }, () => good), badNutrition]); // 6/7 = 85.7%
        expect(oneBad.passes).toBe(true);
        expect(summarize([good, badNutrition]).passes).toBe(false); // 50%
    });

    it("fails on a single missed allergen even if nutrition is perfect", () => {
        const s = summarize([...Array.from({ length: 29 }, () => good), missed]);
        expect(s.nutritionAllRightShare).toBe(1);
        expect(s.labelsWithMissedAllergen).toBe(1);
        expect(s.criticalMisses).toBe(1);
        expect(s.passes).toBe(false);
    });

    it("does not pass on an empty set", () => {
        expect(summarize([]).passes).toBe(false);
    });
});
