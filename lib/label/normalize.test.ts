import { describe, expect, it } from "vitest";

import { normalizeExtraction, sanitizeNutrition } from "./normalize";
import { rawExtractionSchema, type RawExtraction } from "./schema";

const raw = (over: Record<string, unknown> = {}, nutrition: Record<string, unknown> = {}): RawExtraction =>
    rawExtractionSchema.parse({
        productName: "Test",
        kind: "food",
        readable: "good",
        confidence: 0.95,
        ingredientsText: "Farine, sucre, huile",
        ingredientsComplete: true,
        nutrition: { basis: "per100g", ...nutrition },
        ...over,
    });

const codes = (r: ReturnType<typeof normalizeExtraction>) => r.warnings.map((w) => w.code);

describe("normalizeExtraction: nutrition basis", () => {
    it("keeps per-100 g values as they are", () => {
        const r = normalizeExtraction(raw({}, { sugars: 12.5, salt: 0.8, energyKcal: 410 }));
        expect(r.form.nutrition).toMatchObject({ sugars: 12.5, salt: 0.8, energyKcal: 410 });
        expect(codes(r)).not.toContain("perServingConverted");
    });

    it("converts per serving to per 100 g when the serving size is known", () => {
        // 30 g serving with 6 g sugar = 20 g per 100 g
        const r = normalizeExtraction(raw({}, { basis: "perServing", servingSizeG: 30, sugars: 6, energyKcal: 150 }));
        expect(r.form.nutrition.sugars).toBe(20);
        expect(r.form.nutrition.energyKcal).toBe(500);
        expect(codes(r)).toContain("perServingConverted");
    });

    it("drops every nutrient when per serving has no serving size (never guesses)", () => {
        const r = normalizeExtraction(raw({}, { basis: "perServing", sugars: 6, salt: 0.5 }));
        expect(Object.values(r.form.nutrition).every((v) => v === null)).toBe(true);
        expect(codes(r)).toContain("perServingNoSize");
    });

    it("flags an unknown basis", () => {
        expect(codes(normalizeExtraction(raw({}, { basis: "unknown", sugars: 5 })))).toContain("basisUnknown");
    });

    it("treats a per-100 ml table as a drink even if the model said food", () => {
        const r = normalizeExtraction(raw({ kind: "food" }, { basis: "per100ml", sugars: 10 }));
        expect(r.form.kind).toBe("drink");
    });
});

describe("normalizeExtraction: salt and sodium", () => {
    it("derives salt from sodium (x 2.5) when salt is absent", () => {
        const r = normalizeExtraction(raw({}, { sodium: 0.4 }));
        expect(r.form.nutrition.salt).toBe(1);
        expect(codes(r)).toContain("saltFromSodium");
    });

    it("prefers printed salt over sodium", () => {
        const r = normalizeExtraction(raw({}, { salt: 0.5, sodium: 0.4 }));
        expect(r.form.nutrition.salt).toBe(0.5);
        expect(codes(r)).not.toContain("saltFromSodium");
    });
});

describe("sanitizeNutrition", () => {
    const blank = { energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null, sugars: null, fiber: null, proteins: null, salt: null };

    it("removes out-of-range values", () => {
        const { nutrition, removed } = sanitizeNutrition({ ...blank, sugars: 250, energyKcal: 5000, fat: 10 });
        expect(nutrition.sugars).toBeNull();
        expect(nutrition.energyKcal).toBeNull();
        expect(nutrition.fat).toBe(10);
        expect(removed).toEqual(expect.arrayContaining(["sugars", "energyKcal"]));
    });

    it("removes saturated fat larger than fat, and sugars larger than carbohydrates", () => {
        const { nutrition } = sanitizeNutrition({ ...blank, fat: 5, saturatedFat: 8, carbohydrates: 10, sugars: 20 });
        expect(nutrition.saturatedFat).toBeNull();
        expect(nutrition.sugars).toBeNull();
        expect(nutrition.fat).toBe(5);
        expect(nutrition.carbohydrates).toBe(10);
    });

    it("removes the macros when they add up to far more than 100 g", () => {
        const { nutrition, removed } = sanitizeNutrition({ ...blank, fat: 60, carbohydrates: 60, proteins: 30 });
        expect(nutrition.fat).toBeNull();
        expect(nutrition.carbohydrates).toBeNull();
        expect(removed.length).toBeGreaterThan(0);
    });

    it("keeps plausible values untouched", () => {
        const input = { ...blank, fat: 20, saturatedFat: 8, carbohydrates: 50, sugars: 25, proteins: 6, fiber: 3, salt: 1, energyKcal: 440 };
        const { nutrition, removed } = sanitizeNutrition(input);
        expect(nutrition).toEqual(input);
        expect(removed).toEqual([]);
    });
});

describe("normalizeExtraction: reliability", () => {
    it("marks the list complete only for a clear, confident, whole list", () => {
        expect(normalizeExtraction(raw()).form.ingredientsComplete).toBe(true);
    });

    it.each([
        ["partial read", { readable: "partial" }],
        ["low confidence", { confidence: 0.5 }],
        ["model did not see the whole list", { ingredientsComplete: false }],
    ])("never pre-marks complete on %s", (_label, over) => {
        expect(normalizeExtraction(raw(over)).form.ingredientsComplete).toBe(false);
    });

    it("warns on unreadable, partial, low confidence and missing ingredients", () => {
        const r = normalizeExtraction(raw({ readable: "unreadable", confidence: 0.2, ingredientsText: null }));
        expect(codes(r)).toEqual(expect.arrayContaining(["unreadable", "lowConfidence", "noIngredients"]));
        expect(r.form.ingredientsComplete).toBe(false);
        expect(codes(normalizeExtraction(raw({ readable: "partial" })))).toContain("partial");
    });
});
