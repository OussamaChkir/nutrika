import { describe, expect, it } from "vitest";

import type { OFFProduct } from "./openfoodfacts";
import { normalizeOffProduct } from "./product";
import { calculateScore, scoreProduct } from "./scoring";
import { CATEGORY_RULES, getProductCategory } from "./scoring-rules";

const off = (overrides: Partial<OFFProduct> = {}): OFFProduct => ({ code: "0000000000000", ...overrides });
const keys = (aspects: { key?: string }[]) => aspects.map((a) => a.key);

describe("getProductCategory", () => {
    it("detects beverages, fats and oils, cheese, and falls back to general", () => {
        expect(getProductCategory(["en:beverages", "en:sodas"])).toBe("beverage");
        expect(getProductCategory(["en:fats", "en:vegetable-oils", "en:olive-oils"])).toBe("fatOil");
        expect(getProductCategory(["en:butters"])).toBe("fatOil");
        expect(getProductCategory(["en:dairies", "en:cheeses"])).toBe("cheese");
        expect(getProductCategory(["en:snacks", "en:biscuits"])).toBe("general");
        expect(getProductCategory([])).toBe("general");
    });

    it("scores plain milk as a food: its sugar is natural lactose", () => {
        expect(getProductCategory(["en:beverages", "en:dairies", "en:milks"])).toBe("general");
    });

    it("lets cheese and fats win over beverage when tags overlap", () => {
        expect(getProductCategory(["en:beverages", "en:cheeses"])).toBe("cheese");
        expect(getProductCategory(["en:beverages", "en:fats"])).toBe("fatOil");
    });
});

describe("beverages", () => {
    const drink = (sugars: number, extra: Partial<OFFProduct> = {}) =>
        calculateScore(off({ categories_tags: ["en:beverages"], nutriments: { sugars_100g: sugars }, ...extra }));
    const snack = (sugars: number) => calculateScore(off({ nutriments: { sugars_100g: sugars } }));

    it("treats 8 g of sugar per 100 ml as very high, unlike the same value in a snack", () => {
        expect(keys(drink(8).negatives)).toContain("veryHighSugarDrink");
        expect(snack(8).negatives).toHaveLength(0);
        expect(drink(8).score).toBe(60); // 75 - 20 + 5 (no additives)
        expect(snack(8).score).toBe(80);
    });

    it("walks through the drink sugar tiers", () => {
        expect(keys(drink(10.6).negatives)).toContain("veryHighSugarDrink");
        expect(keys(drink(5).negatives)).toContain("highSugarDrink");
        expect(drink(5).score).toBe(70); // 75 - 10 + 5
        expect(keys(drink(1).negatives)).not.toContain("highSugarDrink");
        expect(drink(1).score).toBe(80);
        expect(keys(drink(0).positives)).toContain("lowSugarDrink");
        expect(drink(0).score).toBe(83); // 75 + 3 + 5
    });

    it("ranks a cola with Nutri-Score E in the D band, below the general rule", () => {
        const cola = off({
            categories_tags: ["en:beverages", "en:sodas"],
            nutriments: { sugars_100g: 10.6 },
            nova_group: 4,
            nutriscore_grade: "e",
        });
        const asDrink = calculateScore(cola);
        const asFood = calculateScore({ ...cola, categories_tags: [] });
        // drink: 75 - 20 - 10 + 5 = 50 -> round(50*0.8 + 40*0.2) = 48
        expect(asDrink.score).toBe(48);
        expect(asDrink.letter).toBe("D");
        // food: 75 - 10 - 10 + 5 = 60 -> round(60*0.8 + 40*0.2) = 56
        expect(asFood.score).toBe(56);
        expect(asDrink.score).toBeLessThan(asFood.score);
    });

    it("does not penalise plain milk for its lactose", () => {
        const milk = calculateScore(
            off({ categories_tags: ["en:beverages", "en:milks"], nutriments: { sugars_100g: 4.8 } })
        );
        expect(milk.category).toBe("general");
        expect(milk.negatives).toHaveLength(0);
    });

    it("reports the category on the result", () => {
        expect(drink(0).category).toBe("beverage");
    });
});

describe("fats and oils", () => {
    const fat = (total: number, saturated: number) =>
        calculateScore(
            off({
                categories_tags: ["en:fats"],
                nutriments: { fat_100g: total, "saturated-fat_100g": saturated },
            })
        );

    it("does not penalise olive oil (about 14 % saturated)", () => {
        const olive = fat(100, 14);
        expect(olive.negatives).toHaveLength(0);
        expect(olive.score).toBe(80); // 75 + 5 (no additives)
    });

    it("penalises butter and coconut oil by their share of saturated fat", () => {
        const butter = fat(82, 51); // 62 %
        expect(keys(butter.negatives)).toContain("highSaturatedFatShare");
        expect(butter.negatives[0].params).toEqual({ value: "51.0", share: 62 });
        expect(butter.score).toBe(65); // 75 - 15 + 5
        expect(fat(100, 87).score).toBe(65);
    });

    it("ranks olive oil above butter, which the flat 100 g rule could not do", () => {
        expect(fat(100, 14).score).toBeGreaterThan(fat(82, 51).score);
        const flat = (fatG: number, sat: number) =>
            calculateScore(off({ nutriments: { fat_100g: fatG, "saturated-fat_100g": sat } })).score;
        expect(flat(100, 14)).toBe(flat(82, 51));
    });

    it("applies no saturated-fat rule when total fat is unknown", () => {
        const unknown = calculateScore(off({ categories_tags: ["en:fats"], nutriments: { "saturated-fat_100g": 14 } }));
        expect(unknown.negatives).toHaveLength(0);
    });
});

describe("cheese", () => {
    const cheese = (extra: Partial<OFFProduct> = {}) =>
        calculateScore(
            off({
                categories_tags: ["en:cheeses"],
                nova_group: 3,
                nutriments: { "saturated-fat_100g": 17, salt_100g: 1.4, proteins_100g: 20 },
                ...extra,
            })
        );

    it("does not add the NOVA 3 'processed food' penalty", () => {
        const result = cheese();
        expect(keys(result.negatives)).not.toContain("nova3");
        expect(keys(result.negatives)).toContain("highSaturatedFat");
        // 75 - 10 (sat fat) + 8 (protein) + 5 (no additives)
        expect(result.score).toBe(78);
        // Same product outside the cheese category keeps the NOVA 3 penalty: 78 - 5
        expect(cheese({ categories_tags: [] }).score).toBe(73);
    });

    it("still penalises ultra-processed cheese products (NOVA 4)", () => {
        expect(keys(cheese({ nova_group: 4 }).negatives)).toContain("nova4");
    });
});

describe("rules table", () => {
    it("keeps the general thresholds identical to the original scoring", () => {
        expect(CATEGORY_RULES.general).toEqual({
            sugarUnit: "100g",
            sugar: { veryHigh: 22.5, high: 10, low: 5 },
            saturatedFat: { kind: "absolute", high: 5, low: 1.5 },
            salt: { high: 1.5, low: 0.3 },
            nova3Penalty: 5,
        });
    });
});

describe("scoreProduct is pure", () => {
    const base = normalizeOffProduct(
        off({
            categories_tags: ["en:beverages"],
            nutriments: { sugars_100g: 9 },
            nutriscore_grade: "d",
            additives_tags: ["en:e951"],
            allergens_tags: ["en:milk"],
        })
    );

    it("returns the same result for the same input", () => {
        expect(scoreProduct(base)).toEqual(scoreProduct(base));
    });

    it("does not mutate its input", () => {
        const frozen = structuredClone(base);
        scoreProduct(base);
        expect(base).toEqual(frozen);
    });

    it("gives the same answer through calculateScore and scoreProduct", () => {
        const raw = off({ categories_tags: ["en:beverages"], nutriments: { sugars_100g: 9 }, nutriscore_grade: "d" });
        expect(calculateScore(raw)).toEqual(scoreProduct(normalizeOffProduct(raw)));
    });

    it("ignores Nutri-Score values that are not a grade", () => {
        const plain = calculateScore(off()).score; // 80
        expect(calculateScore(off({ nutriscore_grade: "unknown" })).score).toBe(plain);
        expect(calculateScore(off({ nutriscore_grade: "not-applicable" })).score).toBe(plain);
    });
});
