import { describe, expect, it } from "vitest";

import type { OFFProduct } from "./openfoodfacts";
import { calculateScore } from "./scoring";

const product = (overrides: Partial<OFFProduct> = {}): OFFProduct => ({
    code: "0000000000000",
    ...overrides,
});

const keys = (aspects: { key?: string }[]) => aspects.map((a) => a.key);

describe("calculateScore", () => {
    it("starts at 75 and adds 5 when a product has no additives (grade B)", () => {
        const result = calculateScore(product());
        expect(result.score).toBe(80);
        expect(result.letter).toBe("B");
        expect(keys(result.positives)).toContain("noAdditives");
    });

    it("penalises sugar, saturated fat and NOVA 4, then blends Nutri-Score E", () => {
        const result = calculateScore(
            product({
                nutriments: { sugars_100g: 56.3, "saturated-fat_100g": 10.6 },
                nova_group: 4,
                nutriscore_grade: "e",
            })
        );
        // 75 - 20 (sugar) - 10 (sat fat) - 10 (NOVA 4) + 5 (no additives) = 40
        // Nutri-Score E blend: round(40 * 0.8 + (50 - 10) * 0.2) = 40
        expect(result.score).toBe(40);
        expect(result.letter).toBe("D");
        expect(keys(result.negatives)).toEqual(
            expect.arrayContaining(["veryHighSugar", "highSaturatedFat", "nova4"])
        );
    });

    it("blends Nutri-Score A and E at 20% weight", () => {
        expect(calculateScore(product({ nutriscore_grade: "a" })).score).toBe(76);
        expect(calculateScore(product({ nutriscore_grade: "e" })).score).toBe(72);
    });

    it("penalises controversial additives and drops the no-additives bonus", () => {
        const result = calculateScore(product({ additives_tags: ["en:e102"] }));
        expect(result.score).toBe(69);
        expect(result.letter).toBe("C");
        expect(keys(result.negatives)).toContain("additiveE102");
        expect(keys(result.positives)).not.toContain("noAdditives");
    });

    it("caps the additive penalty at 20 and lists at most 3 additives", () => {
        const result = calculateScore(
            product({ additives_tags: ["en:e102", "en:e110", "en:e122", "en:e124", "en:e129"] })
        );
        expect(result.score).toBe(55); // 75 - 20
        expect(result.negatives).toHaveLength(3);
    });

    it("clamps the score to 0-100", () => {
        const best = calculateScore(
            product({
                nutriments: {
                    sugars_100g: 1,
                    "saturated-fat_100g": 0.5,
                    salt_100g: 0.1,
                    fiber_100g: 5,
                    proteins_100g: 20,
                },
                nova_group: 1,
                labels_tags: ["en:organic", "en:fair-trade", "en:vegan", "en:vegetarian"],
            })
        );
        expect(best.score).toBe(100);
        expect(best.letter).toBe("A");

        const worst = calculateScore(
            product({
                nutriments: { sugars_100g: 60, "saturated-fat_100g": 20, salt_100g: 4 },
                nova_group: 4,
                additives_tags: ["en:e102", "en:e110", "en:e122", "en:e124"],
                nutriscore_grade: "e",
            })
        );
        expect(worst.score).toBeGreaterThanOrEqual(0);
        expect(worst.letter).toBe("E");
    });

    describe("allergens", () => {
        it("rates peanuts as HIGH severity", () => {
            const result = calculateScore(product({ allergens_tags: ["en:peanuts", "en:milk"] }));
            expect(result.allergensSeverity).toBe("HIGH");
            expect(result.allergens.map((a) => a.name)).toEqual(["peanuts", "milk"]);
        });

        it("rates milk alone as MEDIUM and traces as 'may contain'", () => {
            expect(calculateScore(product({ allergens_tags: ["en:milk"] })).allergensSeverity).toBe("MEDIUM");
            const traces = calculateScore(product({ traces_tags: ["en:sesame"] }));
            expect(traces.allergens[0].name).toBe("may contain sesame");
            expect(traces.allergensSeverity).toBe("MEDIUM");
        });

        it("is LOW when there are no allergens", () => {
            expect(calculateScore(product()).allergensSeverity).toBe("LOW");
        });
    });

    describe("dietary tags", () => {
        it("derives keto, muscle gain, diabetic safe and palm oil tags", () => {
            const result = calculateScore(
                product({
                    nutriments: { carbohydrates_100g: 3, sugars_100g: 2, proteins_100g: 20 },
                    ingredients_text: "Chicken, palm oil, salt",
                })
            );
            expect(result.dietaryTags).toEqual(
                expect.arrayContaining(["Keto friendly", "Muscle gain", "Diabetic safe", "Contains palm oil"])
            );
        });

        it("tags palm-oil-free products", () => {
            const result = calculateScore(product({ ingredients_analysis_tags: ["en:palm-oil-free"] }));
            expect(result.dietaryTags).toContain("Palm oil free");
        });
    });
});
