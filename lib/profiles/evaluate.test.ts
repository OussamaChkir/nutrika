import { describe, expect, it } from "vitest";

import { ALLERGY_OPTIONS } from "../allergens";
import type { OFFProduct } from "../openfoodfacts";
import { normalizeOffProduct, productFromStored, type Product } from "../product";
import {
    CONDITIONS,
    DIETS,
    GOALS,
    profileInputSchema,
    type PersonalProfile,
} from "./constants";
import { BLOCK_SCORE_CAP, evaluateProduct, RULES, type PersonalVerdict, type VerdictStatus } from "./evaluate";

// ---------- helpers ----------

const profile = (overrides: Partial<PersonalProfile> = {}): PersonalProfile => ({
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    ...overrides,
});

/** A product with a usable ingredient list (so "none found" is meaningful). */
const product = (overrides: Partial<OFFProduct> = {}): Product =>
    normalizeOffProduct({
        code: "0000000000000",
        ingredients_text: "Sugar, salt, water",
        ...overrides,
    });

/** A product with no ingredient list at all. */
const noIngredients = (overrides: Partial<OFFProduct> = {}): Product =>
    normalizeOffProduct({ code: "0000000000000", ...overrides });

const evaluate = (p: Product, prof: PersonalProfile, universal = 70) => evaluateProduct(p, prof, universal);
const keys = (v: PersonalVerdict) => v.reasons.map((r) => r.key);
const levels = (v: PersonalVerdict) => v.reasons.map((r) => r.level);

// ---------- allergens: contains, may contain, unknown (F7) ----------

describe("allergens: contains", () => {
    it("blocks a product with a declared allergen and caps the score", () => {
        const v = evaluate(product({ allergens_tags: ["en:milk"] }), profile({ allergens: ["Milk"] }), 90);
        expect(v.status).toBe("not_suitable");
        expect(v.allergenState).toBe("contains");
        expect(keys(v)).toContain("allergenContains");
        expect(v.personalScore).toBeLessThanOrEqual(BLOCK_SCORE_CAP);
        expect(v.allergenFindings).toEqual([{ allergen: "Milk", kind: "contains", source: "tag" }]);
    });

    it("blocks on the ingredients text when the tags are missing (second pass)", () => {
        const v = evaluate(product({ ingredients_text: "Farine de blé, lait écrémé" }), profile({ allergens: ["Milk"] }));
        expect(v.status).toBe("not_suitable");
        expect(keys(v)).toContain("allergenContainsText");
        expect(v.allergenFindings[0]).toMatchObject({ allergen: "Milk", source: "text" });
    });

    it("blocks on Arabic ingredients text", () => {
        const v = evaluate(product({ ingredients_text: "طحين القمح، سكر" }), profile({ allergens: ["Gluten"] }));
        expect(v.status).toBe("not_suitable");
    });

    it("does not block when the text only says 'free of' the allergen", () => {
        const v = evaluate(product({ ingredients_text: "Rice, sans gluten" }), profile({ allergens: ["Gluten"] }));
        expect(v.status).toBe("good_match");
        expect(v.allergenState).toBe("none_found");
    });

    it("reports every matched allergen, in the profile's order", () => {
        const v = evaluate(
            product({ allergens_tags: ["en:eggs", "en:peanuts"] }),
            profile({ allergens: ["Peanuts", "Eggs", "Fish"] })
        );
        expect(v.allergenFindings.map((f) => f.allergen)).toEqual(["Peanuts", "Eggs"]);
    });

    it("does not confuse peanuts with tree nuts, in either direction", () => {
        const nuts = product({ allergens_tags: ["en:nuts"] });
        expect(evaluate(nuts, profile({ allergens: ["Peanuts"] })).allergenState).toBe("none_found");
        expect(evaluate(nuts, profile({ allergens: ["Tree Nuts"] })).allergenState).toBe("contains");
        const peanuts = product({ allergens_tags: ["en:peanuts"] });
        expect(evaluate(peanuts, profile({ allergens: ["Tree Nuts"] })).allergenState).toBe("none_found");
    });

    it("treats shellfish as crustaceans and molluscs, but molluscs only as molluscs", () => {
        const crab = product({ allergens_tags: ["en:crustaceans"] });
        const mussel = product({ allergens_tags: ["en:molluscs"] });
        expect(evaluate(crab, profile({ allergens: ["Shellfish"] })).allergenState).toBe("contains");
        expect(evaluate(mussel, profile({ allergens: ["Shellfish"] })).allergenState).toBe("contains");
        expect(evaluate(crab, profile({ allergens: ["Molluscs"] })).allergenState).toBe("none_found");
    });

    it("matches Open Food Facts names that differ from the label (soybeans, sesame seeds)", () => {
        expect(evaluate(product({ allergens_tags: ["en:soybeans"] }), profile({ allergens: ["Soy"] })).status).toBe("not_suitable");
        expect(evaluate(product({ allergens_tags: ["en:sesame-seeds"] }), profile({ allergens: ["Sesame"] })).status).toBe("not_suitable");
    });
});

describe("allergens: may contain and strictness", () => {
    const traces = product({ traces_tags: ["en:peanuts"] });

    it("avoid_traces: a trace is not suitable", () => {
        const v = evaluate(traces, profile({ allergens: ["Peanuts"], allergenStrictness: "avoid_traces" }), 80);
        expect(v.status).toBe("not_suitable");
        expect(v.allergenState).toBe("may_contain");
        expect(v.personalScore).toBeLessThanOrEqual(BLOCK_SCORE_CAP);
    });

    it("intentional_only: a trace is a caution and costs 10 points", () => {
        const v = evaluate(traces, profile({ allergens: ["Peanuts"], allergenStrictness: "intentional_only" }), 80);
        expect(v.status).toBe("caution");
        expect(v.allergenState).toBe("may_contain");
        expect(v.personalScore).toBe(70);
    });

    it("a declared ingredient is not suitable in both modes", () => {
        const contains = product({ allergens_tags: ["en:peanuts"] });
        for (const allergenStrictness of ["avoid_traces", "intentional_only"] as const) {
            expect(evaluate(contains, profile({ allergens: ["Peanuts"], allergenStrictness })).status).toBe("not_suitable");
        }
    });

    it("finds traces in the text ('peut contenir') in both languages", () => {
        const fr = product({ ingredients_text: "Riz. Peut contenir des traces de soja." });
        const ar = product({ ingredients_text: "أرز. قد يحتوي على آثار من سمسم" });
        expect(evaluate(fr, profile({ allergens: ["Soy"] })).allergenState).toBe("may_contain");
        expect(evaluate(ar, profile({ allergens: ["Sesame"] })).allergenState).toBe("may_contain");
    });

    it("an ingredient beats a trace for the same allergen", () => {
        const both = product({ allergens_tags: ["en:milk"], traces_tags: ["en:milk"] });
        expect(evaluate(both, profile({ allergens: ["Milk"] })).allergenState).toBe("contains");
    });
});

describe("allergens: unknown is never green (F7 safety invariant)", () => {
    const missing = noIngredients();
    const incomplete = normalizeOffProduct({
        code: "1",
        ingredients_text: "Flour, sugar",
        states_tags: ["en:ingredients-to-be-completed"],
    });

    it("says 'cannot verify' when there is no ingredient list", () => {
        const v = evaluate(missing, profile({ allergens: ["Milk"] }));
        expect(v.status).toBe("cannot_verify");
        expect(v.allergenState).toBe("unknown");
        expect(keys(v)).toEqual(["allergenUnknown"]);
        expect(v.dataCompleteness).toBe("missing");
    });

    it("says 'cannot verify' when Open Food Facts flags the ingredients as incomplete", () => {
        const v = evaluate(incomplete, profile({ allergens: ["Milk"] }));
        expect(v.status).toBe("cannot_verify");
        expect(v.dataCompleteness).toBe("incomplete");
    });

    it("hides the personal score when allergens cannot be verified", () => {
        expect(evaluate(missing, profile({ allergens: ["Milk"] }), 85).personalScore).toBeNull();
    });

    it("never returns a green or neutral status for ANY allergy on missing or incomplete data", () => {
        for (const allergen of ALLERGY_OPTIONS) {
            for (const strictness of ["avoid_traces", "intentional_only"] as const) {
                for (const p of [missing, incomplete]) {
                    const v = evaluate(p, profile({ allergens: [allergen], allergenStrictness: strictness }), 95);
                    expect(["good_match", "neutral"], `${allergen} / ${strictness}`).not.toContain(v.status);
                    expect(v.personalScore, `${allergen} / ${strictness}`).toBeNull();
                    expect(v.allergenState).toBe("unknown");
                }
            }
        }
    });

    it("never returns green when unknown allergen data is mixed with good news from other rules", () => {
        const v = evaluate(
            noIngredients({ nutriments: { proteins_100g: 25 } }),
            profile({ allergens: ["Eggs"], goals: ["muscle_gain"] }),
            90
        );
        expect(v.status).toBe("cannot_verify");
        expect(levels(v)).toContain("good"); // the protein note is still shown
    });

    it("still reports a declared allergen when the ingredient list is missing", () => {
        const v = evaluate(noIngredients({ allergens_tags: ["en:eggs"] }), profile({ allergens: ["Eggs", "Fish"] }));
        expect(v.status).toBe("not_suitable");
        expect(v.allergenState).toBe("contains");
        expect(keys(v)).toEqual(expect.arrayContaining(["allergenContains", "allergenUnknown"]));
    });

    it("treats a user-added product (no Open Food Facts data) as unverifiable", () => {
        const added = productFromStored({
            barcode: "123",
            name: "Home made",
            brand: null,
            imageUrl: null,
            offData: null,
            allergens: ["milk", "may contain sesame"],
        });
        expect(added.ingredientsStatus).toBe("missing");
        expect(evaluate(added, profile({ allergens: ["Milk"] })).status).toBe("not_suitable");
        expect(evaluate(added, profile({ allergens: ["Sesame"], allergenStrictness: "avoid_traces" })).allergenState).toBe("may_contain");
        expect(evaluate(added, profile({ allergens: ["Eggs"] })).status).toBe("cannot_verify");
    });
});

describe("allergens: none found", () => {
    it("is only claimed on usable data, and reads 'no declared allergen from your list'", () => {
        const v = evaluate(product(), profile({ allergens: ["Milk", "Peanuts"] }), 70);
        expect(v.status).toBe("good_match");
        expect(v.allergenState).toBe("none_found");
        expect(keys(v)).toEqual(["allergenNone"]);
        expect(v.personalScore).toBe(75);
    });

    it("is not applicable for a profile without allergies", () => {
        expect(evaluate(product(), profile()).allergenState).toBe("not_applicable");
    });
});

describe("allergens: lactose versus milk", () => {
    const lactoseFreeMilk = product({ allergens_tags: ["en:milk"], labels_tags: ["en:lactose-free"] });
    const milk = product({ allergens_tags: ["en:milk"] });

    it("lactose-free milk is fine for lactose intolerance", () => {
        const v = evaluate(lactoseFreeMilk, profile({ allergens: ["Lactose"] }));
        expect(v.status).toBe("good_match");
        expect(keys(v)).toContain("lactoseFree");
    });

    it("lactose-free milk is still NOT suitable for a milk allergy", () => {
        expect(evaluate(lactoseFreeMilk, profile({ allergens: ["Milk"] })).status).toBe("not_suitable");
    });

    it("ordinary milk is not suitable for lactose intolerance", () => {
        expect(evaluate(milk, profile({ allergens: ["Lactose"] })).status).toBe("not_suitable");
    });

    it("a lactose-free label does not hide a milk allergy listed next to lactose", () => {
        const v = evaluate(lactoseFreeMilk, profile({ allergens: ["Lactose", "Milk"] }));
        expect(v.status).toBe("not_suitable");
        expect(v.allergenFindings.map((f) => f.allergen)).toEqual(["Milk"]);
    });

    it("trusts the lactose-free label only when it is there", () => {
        const wrongLabel = product({ allergens_tags: ["en:milk"], labels_tags: ["en:gluten-free"] });
        expect(evaluate(wrongLabel, profile({ allergens: ["Lactose"] })).status).toBe("not_suitable");
    });
});

describe("allergens: gluten", () => {
    it("blocks on the gluten tag", () => {
        expect(evaluate(product({ allergens_tags: ["en:gluten"] }), profile({ allergens: ["Gluten"] })).status).toBe("not_suitable");
    });

    it("blocks on wheat in the text when the tag is missing", () => {
        expect(evaluate(product({ ingredients_text: "wheat flour, water" }), profile({ allergens: ["Gluten"] })).status).toBe("not_suitable");
    });

    it("does not block buckwheat", () => {
        expect(evaluate(product({ ingredients_text: "buckwheat flour" }), profile({ allergens: ["Gluten"] })).status).toBe("good_match");
    });
});

// ---------- diets ----------

describe("diets: vegan and vegetarian", () => {
    it.each<[string, Partial<OFFProduct>, VerdictStatus]>([
        ["non-vegan tag", { ingredients_analysis_tags: ["en:non-vegan"] }, "not_suitable"],
        ["vegan tag", { ingredients_analysis_tags: ["en:vegan"] }, "good_match"],
        ["maybe-vegan tag", { ingredients_analysis_tags: ["en:maybe-vegan"] }, "cannot_verify"],
        ["no analysis at all", {}, "cannot_verify"],
        ["vegan label only", { labels_tags: ["en:vegan"] }, "good_match"],
        ["non-vegan tag beats a vegan label", { ingredients_analysis_tags: ["en:non-vegan"], labels_tags: ["en:vegan"] }, "not_suitable"],
    ])("vegan diet, %s -> %s", (_name, off, status) => {
        expect(evaluate(product(off), profile({ diets: ["vegan"] })).status).toBe(status);
    });

    it.each<[string, Partial<OFFProduct>, VerdictStatus]>([
        ["non-vegetarian tag", { ingredients_analysis_tags: ["en:non-vegetarian"] }, "not_suitable"],
        ["vegetarian tag", { ingredients_analysis_tags: ["en:vegetarian"] }, "good_match"],
        ["vegan tag", { ingredients_analysis_tags: ["en:vegan"] }, "good_match"],
        ["non-vegan only (may still be vegetarian)", { ingredients_analysis_tags: ["en:non-vegan"] }, "cannot_verify"],
        ["unknown", {}, "cannot_verify"],
    ])("vegetarian diet, %s -> %s", (_name, off, status) => {
        expect(evaluate(product(off), profile({ diets: ["vegetarian"] })).status).toBe(status);
    });

    it("applies only the vegan rule when both are selected", () => {
        const v = evaluate(product({ ingredients_analysis_tags: ["en:non-vegan"] }), profile({ diets: ["vegan", "vegetarian"] }));
        expect(keys(v)).toEqual(["notVegan"]);
    });
});

describe("hypertension / low sodium", () => {
    const salty = (salt?: number, sodium?: number) =>
        product({ nutriments: { salt_100g: salt, sodium_100g: sodium } });
    const hyper = profile({ conditions: ["hypertension"] });

    it.each([
        [2.0, "caution", 60],
        [1.5, "neutral", 70], // edge: exactly 1.5 g is not "over"
        [1.0, "neutral", 70],
        [0.3, "neutral", 70], // edge: exactly 0.3 g is not "under"
        [0.1, "good_match", 75],
        [0, "good_match", 75],
    ] as const)("salt %s g -> %s, score %s (from 70)", (salt, status, score) => {
        const v = evaluate(salty(salt), hyper, 70);
        expect(v.status).toBe(status);
        expect(v.personalScore).toBe(score);
    });

    it("converts sodium to salt when salt is missing (x2.5)", () => {
        expect(evaluate(salty(undefined, 0.8), hyper).status).toBe("caution"); // = 2.0 g salt
        expect(evaluate(salty(undefined, 0.04), hyper).status).toBe("good_match"); // = 0.1 g salt
    });

    it("says 'cannot verify' when there is no salt or sodium value", () => {
        const v = evaluate(salty(), hyper);
        expect(v.status).toBe("cannot_verify");
        expect(keys(v)).toEqual(["saltUnknown"]);
    });

    it("applies once when hypertension and the low sodium diet are both selected", () => {
        const v = evaluate(salty(2), profile({ conditions: ["hypertension"], diets: ["low_sodium"] }), 70);
        expect(keys(v)).toEqual(["saltHigh"]);
        expect(v.personalScore).toBe(60);
    });

    it("reports the unit: 100 ml for drinks", () => {
        const drink = product({ categories_tags: ["en:beverages"], nutriments: { salt_100g: 2 } });
        expect(evaluate(drink, hyper).reasons[0].params).toEqual({ value: "2.0", unit: "100 ml" });
        expect(evaluate(salty(2), hyper).reasons[0].params).toEqual({ value: "2.0", unit: "100 g" });
    });
});

describe("diabetes (sugar)", () => {
    const sugary = (sugars?: number, extra: Partial<OFFProduct> = {}) =>
        product({ nutriments: { sugars_100g: sugars }, ...extra });
    const diabetic = profile({ conditions: ["diabetes"] });

    it.each([
        [30, "sugarVeryHigh", "caution", 50],
        [22.6, "sugarVeryHigh", "caution", 50],
        [22.5, "sugarHigh", "caution", 60], // edge: not over 22.5
        [10.1, "sugarHigh", "caution", 60],
        [10, null, "neutral", 70], // edge: not over 10
        [5, null, "neutral", 70], // edge: not under 5
        [4.9, "sugarLow", "good_match", 73],
        [0, "sugarLow", "good_match", 73],
    ] as const)("sugar %s g -> %s", (sugar, key, status, score) => {
        const v = evaluate(sugary(sugar), diabetic, 70);
        expect(keys(v)).toEqual(key ? [key] : []);
        expect(v.status).toBe(status);
        expect(v.personalScore).toBe(score);
    });

    it("uses drink thresholds for beverages (8 g per 100 ml is very high)", () => {
        const cola = sugary(8, { categories_tags: ["en:beverages", "en:sodas"] });
        expect(keys(evaluate(cola, diabetic))).toEqual(["sugarVeryHigh"]);
        expect(keys(evaluate(sugary(8), diabetic))).toEqual([]);
    });

    it("says 'cannot verify' when sugar is not available", () => {
        expect(evaluate(sugary(), diabetic).status).toBe("cannot_verify");
    });
});

describe("keto (net carbs)", () => {
    const carbs = (c?: number, fiber?: number) =>
        product({ nutriments: { carbohydrates_100g: c, fiber_100g: fiber } });
    const keto = profile({ diets: ["keto"] });

    it.each([
        [50, 2, "caution"], // net 48
        [12, 4, "neutral"], // net 8
        [14, 4, "neutral"], // net 10: edge, not over
        [14.5, 4, "caution"], // net 10.5
        [8, 3, "good_match"], // net 5: edge, at or under
        [4, undefined, "good_match"],
        [11, undefined, "caution"], // unknown fiber counts as zero
        [2, 10, "good_match"], // net never negative
    ] as const)("carbs %s, fiber %s -> %s", (c, fiber, status) => {
        expect(evaluate(carbs(c, fiber), keto).status).toBe(status);
    });

    it("says 'cannot verify' without a carbohydrate value", () => {
        expect(evaluate(carbs(), keto).status).toBe("cannot_verify");
    });
});

describe("goals", () => {
    it.each([
        [25, "good_match", 78],
        [10.1, "good_match", 78],
        [10, "neutral", 70], // edge: not over 10
        [3, "neutral", 70],
    ] as const)("muscle gain, protein %s g -> %s", (protein, status, score) => {
        const v = evaluate(product({ nutriments: { proteins_100g: protein } }), profile({ goals: ["muscle_gain"] }));
        expect(v.status).toBe(status);
        expect(v.personalScore).toBe(score);
    });

    const loss = profile({ goals: ["weight_loss"] });
    it.each([
        ["500 kcal with high sugar", { energy_kcal_100g: 500, sugars_100g: 30 }, "caution"],
        ["500 kcal with high saturated fat", { energy_kcal_100g: 500, "saturated-fat_100g": 12 }, "caution"],
        ["500 kcal, low sugar and fat", { energy_kcal_100g: 500, sugars_100g: 2, "saturated-fat_100g": 1 }, "neutral"],
        ["400 kcal with high sugar (edge)", { energy_kcal_100g: 400, sugars_100g: 30 }, "neutral"],
        ["300 kcal with high sugar", { energy_kcal_100g: 300, sugars_100g: 30 }, "neutral"],
        ["2100 kJ (about 502 kcal) with high sugar", { energy_100g: 2100, sugars_100g: 30 }, "caution"],
        ["no energy value", { sugars_100g: 30 }, "neutral"],
    ] as const)("weight loss, %s -> %s", (_name, nutriments, status) => {
        expect(evaluate(product({ nutriments }), loss).status).toBe(status);
    });

    it("does not penalise an oil for saturated fat in absolute terms", () => {
        const oil = product({
            categories_tags: ["en:fats"],
            nutriments: { energy_kcal_100g: 900, "saturated-fat_100g": 14, fat_100g: 100 },
        });
        expect(evaluate(oil, loss).status).toBe("neutral");
    });
});

// ---------- status, score and purity ----------

describe("status precedence", () => {
    const rich = product({
        allergens_tags: ["en:milk"],
        ingredients_analysis_tags: [],
        nutriments: { sugars_100g: 30, salt_100g: 0.1, proteins_100g: 20 },
    });

    it("not suitable beats caution, unknown and good", () => {
        const v = evaluate(rich, profile({ allergens: ["Milk"], conditions: ["diabetes"], diets: ["vegan"], goals: ["muscle_gain"] }));
        expect(v.status).toBe("not_suitable");
        expect(new Set(levels(v))).toEqual(new Set(["block", "caution", "unknown", "good"]));
    });

    it("caution beats unknown and good", () => {
        const v = evaluate(rich, profile({ conditions: ["diabetes"], diets: ["vegan"], goals: ["muscle_gain"] }));
        expect(v.status).toBe("caution");
    });

    it("unknown beats good", () => {
        expect(evaluate(rich, profile({ diets: ["vegan"], goals: ["muscle_gain"] })).status).toBe("cannot_verify");
    });

    it("an empty profile judges nothing (neutral, not green)", () => {
        const v = evaluate(rich, profile());
        expect(v.status).toBe("neutral");
        expect(v.reasons).toEqual([]);
        expect(v.personalScore).toBe(70);
    });
});

describe("personal score", () => {
    it("clamps to 0-100", () => {
        const best = product({ nutriments: { proteins_100g: 30 } });
        expect(evaluate(best, profile({ goals: ["muscle_gain"] }), 98).personalScore).toBe(100);
        const worst = product({ nutriments: { sugars_100g: 60 } });
        expect(evaluate(worst, profile({ conditions: ["diabetes"] }), 5).personalScore).toBe(0);
    });

    it("caps a not-suitable verdict even when the universal score is excellent", () => {
        const v = evaluate(product({ allergens_tags: ["en:eggs"] }), profile({ allergens: ["Eggs"] }), 100);
        expect(v.personalScore).toBe(BLOCK_SCORE_CAP);
        expect(v.universalScore).toBe(100);
    });

    it("gives the same barcode a different verdict for two different profiles", () => {
        const p = product({ allergens_tags: ["en:milk"], nutriments: { proteins_100g: 20 } });
        const lactose = evaluate(p, profile({ allergens: ["Milk"] }), 80);
        const athlete = evaluate(p, profile({ goals: ["muscle_gain"] }), 80);
        expect(lactose.status).toBe("not_suitable");
        expect(athlete.status).toBe("good_match");
        expect(lactose.personalScore).not.toBe(athlete.personalScore);
    });
});

describe("purity and passthrough", () => {
    const p = product({
        allergens_tags: ["en:milk"],
        traces_tags: ["en:soybeans"],
        nutriments: { sugars_100g: 12, salt_100g: 2 },
        last_modified_t: 1_760_000_000,
    });
    const prof = profile({ allergens: ["Milk", "Soy"], conditions: ["diabetes", "hypertension"] });

    it("returns the same result for the same input", () => {
        expect(evaluate(p, prof)).toEqual(evaluate(p, prof));
    });

    it("does not mutate the product or the profile", () => {
        const productBefore = structuredClone(p);
        const profileBefore = structuredClone(prof);
        evaluate(p, prof);
        expect(p).toEqual(productBefore);
        expect(prof).toEqual(profileBefore);
    });

    it("passes data completeness and last edit date through for display", () => {
        const v = evaluate(p, prof);
        expect(v.dataCompleteness).toBe("usable");
        expect(v.lastModified).toBe(1_760_000_000);
    });
});

// ---------- the editor can only offer options that have a rule ----------

describe("profile options have rules", () => {
    it.each([
        ...CONDITIONS.map((c) => [`condition ${c}`, profile({ conditions: [c] })] as const),
        ...DIETS.map((d) => [`diet ${d}`, profile({ diets: [d] })] as const),
        ...GOALS.map((g) => [`goal ${g}`, profile({ goals: [g] })] as const),
        ["allergens", profile({ allergens: ["Milk"] })] as const,
    ])("%s is judged by at least one rule", (_name, prof) => {
        expect(RULES.some((r) => r.applies(prof))).toBe(true);
    });
});

// ---------- input validation ----------

describe("profileInputSchema", () => {
    const valid = { name: "Sara", consent: true as const };

    it("requires explicit consent", () => {
        expect(profileInputSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
        expect(profileInputSchema.safeParse({ name: "Sara" }).success).toBe(false);
    });

    it("fills safe defaults: adult, avoid_traces, not default, empty lists", () => {
        const parsed = profileInputSchema.parse(valid);
        expect(parsed).toMatchObject({
            ageBand: "adult",
            allergenStrictness: "avoid_traces",
            isDefault: false,
            conditions: [],
            diets: [],
            goals: [],
            allergens: [],
        });
    });

    it("trims the nickname and bounds its length", () => {
        expect(profileInputSchema.parse({ ...valid, name: "  Sara  " }).name).toBe("Sara");
        expect(profileInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
        expect(profileInputSchema.safeParse({ ...valid, name: "x".repeat(41) }).success).toBe(false);
    });

    it("removes duplicates and rejects unknown values", () => {
        expect(profileInputSchema.parse({ ...valid, allergens: ["Milk", "Milk", "Eggs"] }).allergens).toEqual(["Milk", "Eggs"]);
        expect(profileInputSchema.safeParse({ ...valid, allergens: ["Pollen"] }).success).toBe(false);
        expect(profileInputSchema.safeParse({ ...valid, conditions: ["pregnancy"] }).success).toBe(false);
        expect(profileInputSchema.safeParse({ ...valid, ageBand: "baby" }).success).toBe(false);
        expect(profileInputSchema.safeParse({ ...valid, allergenStrictness: "whatever" }).success).toBe(false);
    });
});
