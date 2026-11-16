import { describe, expect, it } from "vitest";

import { detectAllergensInText, textMatchesAllergy } from "./allergen-text";

const contains = (text: string) => [...detectAllergensInText(text).contains].sort();
const traces = (text: string) => [...detectAllergensInText(text).traces].sort();

describe("detectAllergensInText: English", () => {
    it("separates ingredients from 'may contain' statements", () => {
        const text = "Sugar, wheat flour, whole milk powder. May contain nuts and soy.";
        expect(contains(text)).toEqual(["gluten", "milk"]);
        expect(traces(text)).toEqual(["soy", "treeNuts"]);
    });

    it("keeps reading ingredients after a trace sentence ends", () => {
        const text = "Wheat flour. May contain egg. Salt, sesame.";
        expect(contains(text)).toEqual(["gluten", "sesame"]);
        expect(traces(text)).toEqual(["eggs"]);
    });

    it("treats a family that is both an ingredient and a trace as an ingredient", () => {
        const text = "Milk chocolate. May contain milk.";
        expect(contains(text)).toEqual(["milk"]);
        expect(traces(text)).toEqual([]);
    });

    it("recognises 'produced in a facility that handles' as a trace statement", () => {
        expect(traces("Rice. Made in a facility that also handles peanuts")).toEqual(["peanuts"]);
    });

    it("finds each of the 14 families", () => {
        const samples: Record<string, string> = {
            gluten: "barley malt",
            milk: "whey powder",
            eggs: "egg white",
            peanuts: "groundnut oil",
            treeNuts: "hazelnut paste",
            soy: "soya lecithin",
            fish: "anchovy extract",
            crustaceans: "shrimp paste",
            molluscs: "oyster sauce",
            sesame: "tahini",
            mustard: "mustard seeds",
            celery: "celery salt",
            sulphites: "sulphur dioxide",
            lupin: "lupin flour",
        };
        for (const [group, text] of Object.entries(samples)) {
            expect(contains(text), `${group}: ${text}`).toContain(group);
        }
    });

    it("detects sulphites from E220-E228", () => {
        expect(contains("Dried apricots, preservative E220")).toEqual(["sulphites"]);
        expect(contains("colour E228")).toEqual(["sulphites"]);
        expect(contains("colour E229")).toEqual([]);
    });

    it("does not treat peanuts as tree nuts, or shellfish words as fish", () => {
        expect(contains("roasted peanuts")).toEqual(["peanuts"]);
        expect(contains("mixed nuts")).toEqual(["treeNuts"]);
        expect(contains("shrimp")).toEqual(["crustaceans"]);
    });
});

describe("detectAllergensInText: negations", () => {
    it.each([
        "gluten-free pasta",
        "sans gluten",
        "without egg",
        "free from milk",
        "ne contient pas de lait",
        "lait-free",
        "خالي من الحليب",
        "بدون غلوتين",
    ])("ignores '%s'", (text) => {
        expect(contains(text)).toEqual([]);
    });

    it("still finds an allergen that follows a negated one", () => {
        expect(contains("gluten-free flour, milk")).toEqual(["milk"]);
    });
});

describe("detectAllergensInText: plant milks, butters and look-alikes", () => {
    it("reads nut and soy milks as the nut or soy, not as milk", () => {
        expect(contains("almond milk")).toEqual(["treeNuts"]);
        expect(contains("soy milk")).toEqual(["soy"]);
        expect(contains("lait de soja")).toEqual(["soy"]);
        expect(contains("lait d'amande")).toEqual(["treeNuts"]);
    });

    it("ignores oat, rice and coconut milk", () => {
        expect(contains("coconut milk, rice milk")).toEqual([]);
        expect(contains("lait de coco")).toEqual([]);
    });

    it("ignores cocoa and shea butter but keeps peanut butter as peanuts", () => {
        expect(contains("cocoa butter, shea butter")).toEqual([]);
        expect(contains("beurre de cacao")).toEqual([]);
        expect(contains("peanut butter")).toEqual(["peanuts"]);
        expect(contains("beurre de cacahuète")).toEqual(["peanuts"]);
    });

    it("does not treat coconut, nutmeg or buckwheat as allergens", () => {
        expect(contains("noix de coco")).toEqual([]);
        expect(contains("coconut, nutmeg")).toEqual([]);
        expect(contains("buckwheat flour, farine de sarrasin, blé noir")).toEqual([]);
    });

    it("still finds real dairy butter and cheese", () => {
        expect(contains("butter, cheese")).toEqual(["milk"]);
    });
});

describe("detectAllergensInText: French", () => {
    it("finds ingredients and traces", () => {
        const text = "Farine de blé, lait écrémé, œufs. Peut contenir des traces d'arachides et de soja.";
        expect(contains(text)).toEqual(["eggs", "gluten", "milk"]);
        expect(traces(text)).toEqual(["peanuts", "soy"]);
    });

    it("handles accents and oe ligatures both ways", () => {
        expect(contains("oeufs")).toEqual(["eggs"]);
        expect(contains("œuf")).toEqual(["eggs"]);
        expect(contains("crème fraîche")).toEqual(["milk"]);
        expect(contains("creme fraiche")).toEqual(["milk"]);
        expect(contains("céleri")).toEqual(["celery"]);
    });
});

describe("detectAllergensInText: Arabic", () => {
    it("finds ingredients and traces", () => {
        const text = "طحين القمح، حليب مجفف، بيض. قد يحتوي على آثار من سمسم";
        expect(contains(text)).toEqual(["eggs", "gluten", "milk"]);
        expect(traces(text)).toEqual(["sesame"]);
    });

    it("sees through attached articles and prepositions", () => {
        expect(contains("والحليب")).toEqual(["milk"]); // "and the milk"
        expect(contains("بالسمسم")).toEqual(["sesame"]); // "with sesame"
        expect(contains("للبيض")).toEqual(["eggs"]);
    });

    it("recognises Tunisian peanut and lupin words", () => {
        expect(contains("كاكاوية")).toEqual(["peanuts"]);
        expect(contains("ترمس")).toEqual(["lupin"]);
    });

    it("does not match inside longer Arabic words", () => {
        // "سمسمة" is not in the list; matching must be on whole words.
        expect(contains("سمسمة")).toEqual([]);
    });
});

describe("detectAllergensInText: edge cases", () => {
    it("returns nothing for empty, blank or missing text", () => {
        for (const text of ["", "   ", undefined, null]) {
            expect(detectAllergensInText(text).contains.size).toBe(0);
            expect(detectAllergensInText(text).traces.size).toBe(0);
        }
    });

    it("does not match allergen words inside longer words", () => {
        expect(contains("buttery flavour")).toEqual([]);
        expect(contains("eggplant")).toEqual([]);
        expect(contains("cod liver")).toEqual(["fish"]);
        expect(contains("codex")).toEqual([]);
    });

    it("is stable when called twice (no regex state leaks)", () => {
        const text = "milk, wheat. May contain soy";
        expect(contains(text)).toEqual(contains(text));
        expect(traces(text)).toEqual(traces(text));
    });
});

describe("textMatchesAllergy", () => {
    it("maps allergy labels to text families", () => {
        expect(textMatchesAllergy("Milk", new Set(["milk"]))).toBe(true);
        expect(textMatchesAllergy("Lactose", new Set(["milk"]))).toBe(true);
        expect(textMatchesAllergy("Shellfish", new Set(["molluscs"]))).toBe(true);
        expect(textMatchesAllergy("Molluscs", new Set(["crustaceans"]))).toBe(false);
        expect(textMatchesAllergy("Peanuts", new Set(["treeNuts"]))).toBe(false);
    });
});
