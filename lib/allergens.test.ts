import { describe, expect, it } from "vitest";

import {
    ALLERGENS,
    ALLERGY_OPTIONS,
    findAllergenMatches,
    getAllergenSeverity,
} from "./allergens";

describe("canonical allergen list", () => {
    it("covers the 14 EU allergens plus lactose", () => {
        expect(ALLERGY_OPTIONS.filter((a) => ALLERGENS[a].euListed)).toHaveLength(14);
        expect(ALLERGENS.Lactose.euListed).toBe(false);
        expect(ALLERGY_OPTIONS).toHaveLength(15);
    });

    it("keeps every label users may already have stored", () => {
        const legacy = [
            "Gluten", "Lactose", "Milk", "Eggs", "Peanuts", "Tree Nuts", "Soy",
            "Fish", "Shellfish", "Sesame", "Mustard", "Celery", "Sulphites",
        ];
        for (const label of legacy) expect(ALLERGY_OPTIONS).toContain(label);
    });

    it("has a unique i18n key per allergen", () => {
        const keys = ALLERGY_OPTIONS.map((a) => ALLERGENS[a].i18nKey);
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe("getAllergenSeverity", () => {
    it("rates peanuts, tree nuts, fish and crustaceans as HIGH", () => {
        for (const name of ["peanuts", "tree nuts", "nuts", "fish", "crustaceans", "molluscs"]) {
            expect(getAllergenSeverity(name)).toBe("HIGH");
        }
    });

    it("rates milk, eggs, soy and sesame as MEDIUM, including traces", () => {
        for (const name of ["milk", "eggs", "soybeans", "sesame seeds", "may contain sesame"]) {
            expect(getAllergenSeverity(name)).toBe("MEDIUM");
        }
    });

    it("rates the rest, and unknown names, as LOW", () => {
        for (const name of ["gluten", "celery", "mustard", "lupin", "something else"]) {
            expect(getAllergenSeverity(name)).toBe("LOW");
        }
    });

    it("does not treat peanuts as tree nuts or shellfish as fish", () => {
        expect(getAllergenSeverity("peanuts")).toBe("HIGH");
        expect(findAllergenMatches(["Tree Nuts"], ["peanuts"])).toEqual([]);
        expect(findAllergenMatches(["Fish"], ["crustaceans"])).toEqual([]);
    });
});

describe("findAllergenMatches", () => {
    it("matches the user's allergies against product allergens and traces", () => {
        const matches = findAllergenMatches(
            ["Peanuts", "Milk", "Gluten"],
            ["milk", "may contain peanuts"]
        );
        expect(matches).toEqual([
            { allergy: "Peanuts", productAllergen: "may contain peanuts", trace: true },
            { allergy: "Milk", productAllergen: "milk", trace: false },
        ]);
    });

    it("matches Open Food Facts names that differ from the label", () => {
        expect(findAllergenMatches(["Soy"], ["soybeans"])).toHaveLength(1);
        expect(findAllergenMatches(["Sesame"], ["sesame seeds"])).toHaveLength(1);
        expect(findAllergenMatches(["Sulphites"], ["sulphur dioxide and sulphites"])).toHaveLength(1);
        expect(findAllergenMatches(["Tree Nuts"], ["nuts"])).toHaveLength(1);
    });

    it("treats a milk declaration as relevant for lactose", () => {
        expect(findAllergenMatches(["Lactose"], ["milk"])).toHaveLength(1);
    });

    it("matches shellfish to crustaceans and molluscs, but molluscs only to molluscs", () => {
        expect(findAllergenMatches(["Shellfish"], ["crustaceans", "molluscs"])).toHaveLength(2);
        expect(findAllergenMatches(["Molluscs"], ["crustaceans", "molluscs"])).toHaveLength(1);
    });

    it("ignores unknown allergy labels and returns nothing when nothing matches", () => {
        expect(findAllergenMatches(["Pollen"], ["milk"])).toEqual([]);
        expect(findAllergenMatches(["Eggs"], [])).toEqual([]);
        expect(findAllergenMatches([], ["milk"])).toEqual([]);
    });
});
