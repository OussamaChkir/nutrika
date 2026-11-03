import { describe, expect, it } from "vitest";

import type { OFFProduct } from "../openfoodfacts";
import { normalizeOffProduct, type Product } from "../product";
import type { PersonalProfile } from "../profiles/constants";
import { scoreProduct } from "../scoring";
import {
    isSoldIn,
    MAX_ALTERNATIVES,
    MIN_SCORE_GAIN,
    pickReason,
    rankAlternatives,
    shouldOfferAlternatives,
} from "./rank";

// ---------- fixtures (no network) ----------

type Nut = NonNullable<OFFProduct["nutriments"]>;

let counter = 0;
/** A product with complete data. Override what the test is about. */
const make = (over: Partial<OFFProduct> = {}, nut: Nut = {}): Product =>
    normalizeOffProduct({
        code: over.code ?? `${100000 + counter++}`,
        product_name: over.product_name ?? "Test product",
        ingredients_text: "Sugar, wheat flour, palm oil",
        nutriments: {
            sugars_100g: 10,
            "saturated-fat_100g": 3,
            salt_100g: 0.8,
            fat_100g: 12,
            carbohydrates_100g: 50,
            proteins_100g: 6,
            ...nut,
        },
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

const universal = (p: Product) => scoreProduct(p).score;

// A clearly poor product and a clearly better one.
const poor = () => make({ code: "1" }, { sugars_100g: 40, "saturated-fat_100g": 12, salt_100g: 2.5 });
const better = (over: Partial<OFFProduct> = {}, nut: Nut = {}) =>
    make(over, { sugars_100g: 2, "saturated-fat_100g": 0.5, salt_100g: 0.1, ...nut });

const rank = (current: Product, candidates: Product[], prof: PersonalProfile | null = null, limit?: number) =>
    rankAlternatives({ current, currentScore: universal(current), candidates, profile: prof, limit });

// ---------- tests ----------

describe("fixtures sanity", () => {
    it("the better product scores clearly higher", () => {
        expect(universal(better())).toBeGreaterThan(universal(poor()) + MIN_SCORE_GAIN);
    });
});

describe("rankAlternatives: which candidates qualify", () => {
    it("suggests a clearly better product", () => {
        const out = rank(poor(), [better({ code: "2" })]);
        expect(out.map((a) => a.barcode)).toEqual(["2"]);
        expect(out[0].delta).toBeGreaterThanOrEqual(MIN_SCORE_GAIN);
    });

    it("never suggests the scanned product itself, and de-duplicates", () => {
        const cur = poor();
        const out = rank(cur, [better({ code: cur.barcode }), better({ code: "2" }), better({ code: "2" })]);
        expect(out.map((a) => a.barcode)).toEqual(["2"]);
    });

    it("requires a real gain, not a marginal one", () => {
        const cur = make({ code: "1" }, { sugars_100g: 20 });
        const barely = make({ code: "2" }, { sugars_100g: 19 });
        expect(rank(cur, [barely])).toEqual([]);
    });

    it("drops candidates with too little nutrition data (they would look good by default)", () => {
        const thin = normalizeOffProduct({ code: "3", product_name: "Mystery", nutriments: { sugars_100g: 0 } });
        expect(rank(poor(), [thin])).toEqual([]);
    });

    it("drops candidates without a usable name", () => {
        const unnamed = better({ code: "4", product_name: "" });
        expect(rank(poor(), [unnamed])).toEqual([]);
    });

    it("returns an empty list when nothing is better, never a worse product", () => {
        const good = better({ code: "1" });
        expect(rank(good, [poor(), make({ code: "5" })])).toEqual([]);
    });

    it("respects the limit and the default maximum", () => {
        const many = Array.from({ length: 10 }, (_, i) => better({ code: `2${i}` }));
        expect(rank(poor(), many)).toHaveLength(MAX_ALTERNATIVES);
        expect(rank(poor(), many, null, 2)).toHaveLength(2);
    });
});

describe("rankAlternatives: order", () => {
    it("best score first, then fewer additives, then more protein, then barcode", () => {
        const a = better({ code: "30" }, { sugars_100g: 1 });
        const bFewAdditives = better({ code: "31", additives_tags: [] });
        const bManyAdditives = better({ code: "32", additives_tags: ["en:e330", "en:e202"] });
        const out = rank(poor(), [bManyAdditives, bFewAdditives, a]);
        const scores = out.map((x) => x.score);
        expect(scores).toEqual([...scores].sort((x, y) => y - x));
    });

    it("is deterministic whatever the input order", () => {
        const items = ["40", "41", "42", "43"].map((code) => better({ code }));
        const forward = rank(poor(), items).map((a) => a.barcode);
        const reversed = rank(poor(), [...items].reverse()).map((a) => a.barcode);
        expect(reversed).toEqual(forward);
    });

    it("breaks ties on additives then protein", () => {
        const fewer = better({ code: "51", additives_tags: [] });
        const more = better({ code: "50", additives_tags: ["en:e330"] });
        expect(rank(poor(), [more, fewer]).map((a) => a.barcode)).toEqual(["51", "50"]);
        const lowProtein = better({ code: "52" }, { proteins_100g: 1 });
        const highProtein = better({ code: "53" }, { proteins_100g: 9 });
        expect(rank(poor(), [lowProtein, highProtein]).map((a) => a.barcode)[0]).toBe("53");
    });

    it("does not change its inputs", () => {
        const cur = poor();
        const cands = [better({ code: "60" }), better({ code: "61" })];
        const snapshot = JSON.stringify([cur, cands]);
        rank(cur, cands, profile({ allergens: ["Milk"] }));
        expect(JSON.stringify([cur, cands])).toBe(snapshot);
    });
});

describe("rankAlternatives: with a profile", () => {
    it("never suggests a product that is not suitable (allergen)", () => {
        const withMilk = better({ code: "70", allergens_tags: ["en:milk"] });
        const safe = better({ code: "71" });
        const out = rank(poor(), [withMilk, safe], profile({ allergens: ["Milk"] }));
        expect(out.map((a) => a.barcode)).toEqual(["71"]);
    });

    it("never suggests a 'may contain' product to someone who avoids traces", () => {
        const traces = better({ code: "72", traces_tags: ["en:peanuts"] });
        expect(rank(poor(), [traces], profile({ allergens: ["Peanuts"], allergenStrictness: "avoid_traces" }))).toEqual([]);
    });

    it("never suggests a product whose allergens cannot be verified (no ingredient list)", () => {
        const noIngredients = normalizeOffProduct({
            code: "73",
            product_name: "No list",
            nutriments: { sugars_100g: 2, "saturated-fat_100g": 0.5, salt_100g: 0.1, fat_100g: 5, carbohydrates_100g: 30, proteins_100g: 5 },
        });
        expect(rank(poor(), [noIngredients], profile({ allergens: ["Milk"] }))).toEqual([]);
        // Without an allergy the same product is fine.
        expect(rank(poor(), [noIngredients], profile()).map((a) => a.barcode)).toEqual(["73"]);
    });

    it("never suggests a non-vegan product to a vegan", () => {
        const nonVegan = better({ code: "74", ingredients_analysis_tags: ["en:non-vegan"] });
        const vegan = better({ code: "75", ingredients_analysis_tags: ["en:vegan"] });
        const out = rank(poor(), [nonVegan, vegan], profile({ diets: ["vegan"] }));
        expect(out.map((a) => a.barcode)).toEqual(["75"]);
    });

    it("ranks on the personal score and says so", () => {
        const out = rank(poor(), [better({ code: "76" })], profile({ conditions: ["diabetes"] }));
        expect(out[0].deltaIsPersonal).toBe(true);
        expect(out[0].personalScore).not.toBeNull();
        expect(rank(poor(), [better({ code: "76" })])[0].deltaIsPersonal).toBe(false);
    });

    it("a product with a low sugar figure but polyol sweeteners is not rewarded for diabetes", () => {
        const withPolyol = better({ code: "77", additives_tags: ["en:e965"] });
        const plain = better({ code: "78" });
        const out = rank(poor(), [withPolyol, plain], profile({ conditions: ["diabetes"] }));
        const byCode = Object.fromEntries(out.map((a) => [a.barcode, a.personalScore]));
        if (byCode["77"] !== undefined) expect(byCode["77"]!).toBeLessThanOrEqual(byCode["78"]!);
    });
});

describe("pickReason", () => {
    it("names the biggest improvement, with the numbers", () => {
        const cur = make({}, { sugars_100g: 30, salt_100g: 1, "saturated-fat_100g": 3 });
        const cand = make({}, { sugars_100g: 5, salt_100g: 0.9, "saturated-fat_100g": 3 });
        expect(pickReason(cur, cand)).toEqual({ key: "lessSugar", params: { from: 30, to: 5, unit: "100 g" } });
    });

    it("uses 100 ml for drinks", () => {
        const cur = make({ categories_tags: ["en:beverages"] }, { sugars_100g: 10 });
        const cand = make({ categories_tags: ["en:beverages"] }, { sugars_100g: 1 });
        expect(pickReason(cur, cand).params?.unit).toBe("100 ml");
    });

    it.each([
        ["lessSalt", { salt_100g: 2 }, { salt_100g: 0.5 }],
        ["lessSaturatedFat", { "saturated-fat_100g": 10 }, { "saturated-fat_100g": 2 }],
        ["moreProtein", { proteins_100g: 2 }, { proteins_100g: 12 }],
        ["moreFiber", { fiber_100g: 1 }, { fiber_100g: 8 }],
    ] as const)("%s", (key, curNut, candNut) => {
        const base: Nut = { sugars_100g: 5, salt_100g: 0.5, "saturated-fat_100g": 1, proteins_100g: 6, fiber_100g: 3 };
        expect(pickReason(make({}, { ...base, ...curNut }), make({}, { ...base, ...candNut })).key).toBe(key);
    });

    it("counts fewer additives and a lower NOVA group", () => {
        const cur = make({ additives_tags: ["en:e330", "en:e202", "en:e300"], nova_group: 4 });
        const cand = make({ additives_tags: [], nova_group: 1 });
        expect(["fewerAdditives", "lessProcessed"]).toContain(pickReason(cur, cand).key);
        expect(pickReason(make({ additives_tags: ["en:e330", "en:e202"] }), make({ additives_tags: [] })).key).toBe("fewerAdditives");
        expect(pickReason(make({ nova_group: 4 }), make({ nova_group: 2 })).key).toBe("lessProcessed");
    });

    it("falls back to a plain 'better score' when nothing stands out", () => {
        expect(pickReason(make(), make())).toEqual({ key: "betterScore" });
    });
});

describe("shouldOfferAlternatives", () => {
    it.each([
        ["A", undefined, false],
        ["B", undefined, false],
        ["C", undefined, true],
        ["D", undefined, true],
        ["E", undefined, true],
        ["A", "not_suitable", true],
        ["B", "caution", true],
        ["B", "good_match", false],
        ["B", "cannot_verify", false],
        ["B", null, false],
    ] as const)("grade %s, verdict %s -> %s", (letter, status, expected) => {
        expect(shouldOfferAlternatives({ letter, status })).toBe(expected);
    });
});

describe("isSoldIn", () => {
    it("is silent without a configured country or without data", () => {
        expect(isSoldIn({ countriesTags: ["en:france"] }, null)).toBeNull();
        expect(isSoldIn({ countriesTags: [] }, "en:tunisia")).toBeNull();
    });
    it("says yes or no when it knows", () => {
        expect(isSoldIn({ countriesTags: ["en:tunisia", "en:france"] }, "en:tunisia")).toBe(true);
        expect(isSoldIn({ countriesTags: ["en:france"] }, "en:tunisia")).toBe(false);
    });
});
