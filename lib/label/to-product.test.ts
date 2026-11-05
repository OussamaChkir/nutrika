import { describe, expect, it } from "vitest";

import { evaluateProduct } from "../profiles/evaluate";
import type { PersonalProfile } from "../profiles/constants";
import { scoreProduct } from "../scoring";
import { composeIngredientsText, labelToProduct, PHOTO_BARCODE } from "./to-product";
import type { LabelForm } from "./schema";

const form = (over: Partial<LabelForm> = {}): LabelForm => ({
    productName: "Biscuit",
    brand: "Marque",
    kind: "food",
    ingredientsText: "Farine de blé, sucre, huile de palme",
    ingredientsComplete: true,
    allergensContains: [],
    allergensMayContain: [],
    nutrition: { energyKcal: 450, fat: 18, saturatedFat: 8, carbohydrates: 62, sugars: 25, fiber: 2, proteins: 6, salt: 0.6 },
    ...over,
});

const profile = (over: Partial<PersonalProfile> = {}): PersonalProfile => ({
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    ...over,
});

const verdict = (f: LabelForm, p: PersonalProfile) => {
    const product = labelToProduct(f);
    return evaluateProduct(product, p, scoreProduct(product).score);
};

describe("composeIngredientsText", () => {
    it("appends contains and may-contain statements", () => {
        const t = composeIngredientsText(form({ allergensContains: ["milk"], allergensMayContain: ["peanuts", "soy"] }));
        expect(t).toBe("Farine de blé, sucre, huile de palme. Contains: milk. May contain traces of: peanuts, soy.");
    });

    it("does not double the final full stop", () => {
        expect(composeIngredientsText(form({ ingredientsText: "Sugar, salt." }))).toBe("Sugar, salt.");
    });

    it("is empty when there is nothing", () => {
        expect(composeIngredientsText(form({ ingredientsText: "" }))).toBe("");
    });
});

describe("labelToProduct", () => {
    it("builds a scorable product with the photo barcode", () => {
        const p = labelToProduct(form());
        expect(p.barcode).toBe(PHOTO_BARCODE);
        expect(p.name).toBe("Biscuit");
        const s = scoreProduct(p);
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(100);
    });

    it("scores a drink with drink rules", () => {
        const water = labelToProduct(form({ kind: "drink", ingredientsText: "Water", nutrition: { energyKcal: 0, fat: 0, saturatedFat: 0, carbohydrates: 0, sugars: 0, fiber: null, proteins: 0, salt: 0 } }));
        const soda = labelToProduct(form({ kind: "drink", ingredientsText: "Water, sugar", nutrition: { energyKcal: 42, fat: 0, saturatedFat: 0, carbohydrates: 10.6, sugars: 10.6, fiber: null, proteins: 0, salt: 0 } }));
        expect(scoreProduct(water).score).toBeGreaterThan(scoreProduct(soda).score);
    });

    it("uses a placeholder name when none was read", () => {
        expect(labelToProduct(form({ productName: "" })).name).toBeTruthy();
    });
});

describe("allergy safety (the point of the review step)", () => {
    const peanut = profile({ allergens: ["Peanuts"] });

    it("flags a declared peanut trace as may contain (strict profile: not suitable)", () => {
        const v = verdict(form({ allergensMayContain: ["peanuts"] }), peanut);
        expect(v.allergenState).toBe("may_contain");
        expect(v.status).toBe("not_suitable");
    });

    it("relaxed profile: a trace is only a caution", () => {
        const v = verdict(form({ allergensMayContain: ["peanuts"] }), profile({ allergens: ["Peanuts"], allergenStrictness: "intentional_only" }));
        expect(v.allergenState).toBe("may_contain");
        expect(v.status).toBe("caution");
    });

    it("flags a declared allergen as contains", () => {
        const v = verdict(form({ allergensContains: ["peanuts"] }), peanut);
        expect(v.allergenState).toBe("contains");
        expect(v.status).toBe("not_suitable");
    });

    it("finds an allergen written in the ingredient text", () => {
        const v = verdict(form({ ingredientsText: "Sugar, peanuts, salt" }), peanut);
        expect(v.allergenState).toBe("contains");
    });

    it("an allergy with an incomplete list is cannot_verify, never green", () => {
        const v = verdict(form({ ingredientsComplete: false }), peanut);
        expect(v.allergenState).toBe("unknown");
        expect(v.status).toBe("cannot_verify");
    });

    it("an allergy with no ingredient text at all is cannot_verify, never green", () => {
        const v = verdict(form({ ingredientsText: "", ingredientsComplete: false }), peanut);
        expect(v.status).toBe("cannot_verify");
    });

    it("an allergen box alone (no ingredient list) cannot give a green result either", () => {
        const v = verdict(form({ ingredientsText: "", ingredientsComplete: false, allergensContains: ["milk"] }), peanut);
        expect(v.status).not.toBe("good_match");
        expect(v.allergenState).toBe("unknown");
    });

    it("a complete list without the allergen is none_found", () => {
        const v = verdict(form(), peanut);
        expect(v.allergenState).toBe("none_found");
    });
});
