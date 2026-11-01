import { describe, expect, it } from "vitest";

import type { OFFProduct } from "./openfoodfacts";
import { normalizeOffProduct, parseAllergens } from "./product";

const off = (overrides: Partial<OFFProduct> = {}): OFFProduct => ({ code: "3017620422003", ...overrides });

describe("normalizeOffProduct", () => {
    it("maps names, brand and image with the same fallbacks as before", () => {
        const p = normalizeOffProduct(
            off({ product_name_en: "Spread", brands: "Brand", image_url: "https://img/a.jpg" })
        );
        expect(p.barcode).toBe("3017620422003");
        expect(p.name).toBe("Spread");
        expect(p.brand).toBe("Brand");
        expect(p.imageUrl).toBe("https://img/a.jpg");
        expect(normalizeOffProduct(off()).name).toBe("Unknown Product");
        expect(normalizeOffProduct(off()).brand).toBeNull();
        expect(normalizeOffProduct(off()).imageUrl).toBeNull();
    });

    it("maps nutriments once, keeping kcal and kJ apart", () => {
        const p = normalizeOffProduct(
            off({
                nutriments: {
                    energy_kcal_100g: 539,
                    energy_100g: 2255,
                    "saturated-fat_100g": 10.6,
                    sugars_100g: 56.3,
                    salt_100g: 0.1,
                },
            })
        );
        expect(p.nutrients).toMatchObject({
            energyKcal: 539,
            energyKj: 2255,
            saturatedFat: 10.6,
            sugars: 56.3,
            salt: 0.1,
        });
        expect(p.nutrients.fiber).toBeUndefined();
    });

    it("keeps only real Nutri-Score grades", () => {
        expect(normalizeOffProduct(off({ nutriscore_grade: "C" })).nutriscoreGrade).toBe("c");
        expect(normalizeOffProduct(off({ nutriscore_grade: "unknown" })).nutriscoreGrade).toBeUndefined();
        expect(normalizeOffProduct(off({ nutriscore_grade: "not-applicable" })).nutriscoreGrade).toBeUndefined();
    });

    it("splits allergens and traces, and upper-cases additive codes", () => {
        const p = normalizeOffProduct(
            off({
                allergens_tags: ["en:tree-nuts", "en:milk"],
                traces_tags: ["en:sesame-seeds"],
                additives_tags: ["en:e150d", "en:e322i"],
            })
        );
        expect(p.allergens).toEqual(["tree nuts", "milk"]);
        expect(p.traces).toEqual(["sesame seeds"]);
        expect(p.additives).toEqual(["E150D", "E322I"]);
    });

    it("derives label flags (organic also matches 'bio')", () => {
        expect(normalizeOffProduct(off({ labels_tags: ["en:organic", "en:vegan"] })).labels).toEqual({
            organic: true,
            fairTrade: false,
            vegan: true,
            vegetarian: false,
        });
        expect(normalizeOffProduct(off({ labels_tags: ["fr:ab-agriculture-biologique", "fr:bio"] })).labels.organic).toBe(true);
    });

    it("defaults missing lists to empty arrays", () => {
        const p = normalizeOffProduct(off());
        expect(p.additives).toEqual([]);
        expect(p.allergens).toEqual([]);
        expect(p.traces).toEqual([]);
        expect(p.categoryTags).toEqual([]);
        expect(p.ingredientsAnalysisTags).toEqual([]);
    });
});

describe("parseAllergens (legacy helper)", () => {
    it("lists allergens first, then 'may contain' traces", () => {
        expect(parseAllergens(off({ allergens_tags: ["en:milk"], traces_tags: ["en:eggs"] }))).toEqual([
            "milk",
            "may contain eggs",
        ]);
    });
});
