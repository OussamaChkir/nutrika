import { describe, expect, it } from "vitest";

import { labelFormSchema, parseNumber, rawExtractionSchema } from "./schema";

describe("parseNumber", () => {
    it.each([
        [12.5, 12.5],
        ["12.5", 12.5],
        ["12,5", 12.5],
        ["12.5 g", 12.5],
        ["<0.5", 0.5],
        ["٣٫٥", 3.5], // Arabic-Indic digits and decimal separator
        ["١٢", 12],
    ])("reads %j as %j", (input, expected) => {
        expect(parseNumber(input)).toBe(expected);
    });

    it.each([[null], [undefined], [""], ["abc"], [NaN], [Infinity], [{}]])("returns null for %j", (input) => {
        expect(parseNumber(input)).toBeNull();
    });
});

describe("rawExtractionSchema", () => {
    it("accepts a normal answer", () => {
        const r = rawExtractionSchema.safeParse({
            productName: "Biscuits",
            kind: "food",
            readable: "good",
            confidence: 0.9,
            ingredientsText: "Farine, sucre",
            ingredientsComplete: true,
            allergensContains: ["gluten"],
            allergensMayContain: [],
            nutrition: { basis: "per100g", sugars: "22,5", salt: 0.4 },
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.nutrition.sugars).toBe(22.5);
    });

    it("is lenient about junk: unknown kind, bad numbers and missing fields do not throw", () => {
        const r = rawExtractionSchema.safeParse({ kind: "snack", confidence: "high", nutrition: { sugars: "lots" } });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.nutrition.sugars).toBeNull();
            expect(r.data.ingredientsText).toBeNull();
            expect(r.data.allergensContains).toEqual([]);
        }
    });

    it("rejects something that is not an object", () => {
        expect(rawExtractionSchema.safeParse("hello").success).toBe(false);
        expect(rawExtractionSchema.safeParse(null).success).toBe(false);
    });
});

describe("labelFormSchema (strict, checked again on the server)", () => {
    const valid = {
        productName: "x",
        brand: "",
        kind: "food" as const,
        ingredientsText: "sugar",
        ingredientsComplete: true,
        allergensContains: [],
        allergensMayContain: [],
        nutrition: { energyKcal: 100, fat: 1, saturatedFat: 0, carbohydrates: 20, sugars: 10, fiber: 1, proteins: 2, salt: 0.1 },
    };

    it("accepts a valid form", () => {
        expect(labelFormSchema.safeParse(valid).success).toBe(true);
    });

    it("refuses impossible numbers", () => {
        expect(labelFormSchema.safeParse({ ...valid, nutrition: { ...valid.nutrition, sugars: 140 } }).success).toBe(false);
        expect(labelFormSchema.safeParse({ ...valid, nutrition: { ...valid.nutrition, fat: -1 } }).success).toBe(false);
        expect(labelFormSchema.safeParse({ ...valid, nutrition: { ...valid.nutrition, energyKcal: 2000 } }).success).toBe(false);
    });

    it("refuses an unknown kind and oversized text", () => {
        expect(labelFormSchema.safeParse({ ...valid, kind: "other" }).success).toBe(false);
        expect(labelFormSchema.safeParse({ ...valid, ingredientsText: "a".repeat(4001) }).success).toBe(false);
        expect(labelFormSchema.safeParse({ ...valid, allergensContains: new Array(21).fill("milk") }).success).toBe(false);
    });
});
