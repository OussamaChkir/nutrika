import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import type { OFFProduct } from "../lib/openfoodfacts";
import {
    OFF_FIELDS,
    buildGoldenSet,
    discoverProducts,
    makeTranslator,
    matchAllergies,
    pickAllergies,
    toGoldenCase,
    type Translators,
} from "./golden";

const messages = {
    en: JSON.parse(readFileSync(resolve(__dirname, "../messages/en.json"), "utf-8")),
    fr: JSON.parse(readFileSync(resolve(__dirname, "../messages/fr.json"), "utf-8")),
};

const translators: Translators = {
    en: makeTranslator(messages.en.ScoreMessages),
    fr: makeTranslator(messages.fr.ScoreMessages),
};

const spread: OFFProduct = {
    code: "3017620422003",
    product_name: "Pâte à tartiner",
    brands: "Example",
    nutriments: {
        sugars_100g: 56.3,
        "saturated-fat_100g": 10.6,
        fat_100g: 30.9,
        carbohydrates_100g: 57.5,
        proteins_100g: 6.3,
        salt_100g: 0.1,
    },
    nova_group: 4,
    nutriscore_grade: "e",
    allergens_tags: ["en:milk", "en:nuts"],
    ingredients_text: "Sucre, huile de palme, noisettes 13%",
};

const water: OFFProduct = {
    code: "6111242100992",
    product_name: "Eau minérale",
    nutriments: { sugars_100g: 0, fat_100g: 0, salt_100g: 0.01 },
};

describe("makeTranslator", () => {
    it.each(["en", "fr"] as const)("matches next-intl for every %s message", (locale) => {
        const ns = messages[locale].ScoreMessages as Record<string, string>;
        const reference = createTranslator({ locale, messages: messages[locale], namespace: "ScoreMessages" });
        const mine = makeTranslator(ns);

        for (const key of Object.keys(ns)) {
            expect(mine(key, { value: "12.5" }), key).toBe((reference as any)(key, { value: "12.5" }));
        }
    });

    it("throws on an unknown key so callers can fall back", () => {
        expect(() => makeTranslator({})("nope")).toThrow("Missing message");
    });
});

describe("allergy simulation", () => {
    it("matches with the same substring rule as the service", () => {
        expect(matchAllergies(["Milk"], ["milk", "nuts"])).toEqual(["milk"]);
        expect(matchAllergies(["nut"], ["may contain tree nuts"])).toEqual(["may contain tree nuts"]);
        expect(matchAllergies([" "], ["milk"])).toEqual([]);
    });

    it("gives a real allergy, then a decoy, then none, and never invents one for allergen-free products", () => {
        const allergens = ["milk", "nuts"];
        expect(pickAllergies(0, allergens)).toEqual(["milk"]);
        expect(pickAllergies(1, allergens)).toEqual(["sesame"]);
        expect(pickAllergies(2, allergens)).toEqual([]);
        expect(pickAllergies(0, [])).toEqual([]);
    });

    it("drops the decoy when the product really contains it", () => {
        expect(pickAllergies(1, ["sesame"])).toEqual([]);
    });
});

describe("toGoldenCase", () => {
    it("builds a request from the app's own score and translated aspects", () => {
        const result = toGoldenCase(spread, 0, translators);
        if (!("case" in result)) throw new Error("expected a case");
        const { case: c } = result;

        expect(c.id).toBe("off-3017620422003");
        expect(c.request.locale).toBe("en");
        expect(c.request.product).toMatchObject({
            barcode: "3017620422003",
            name: "Pâte à tartiner",
            grade: expect.stringMatching(/^[A-E]$/),
            nova_group: 4,
            allergens: ["milk", "nuts"],
        });
        expect(c.request.product.score).toBeGreaterThanOrEqual(0);
        // The facts the LLM sees are already text, in the case's language.
        expect(c.request.product.negatives.join(" ")).toContain("56.3");
        // index 0 with allergens: the simulated user has the first allergen, so an alert is expected.
        expect(c.request.user.allergies).toEqual(["milk"]);
        expect(c.expect_alert).toEqual(["milk"]);
    });

    it("writes French facts for French cases", () => {
        const en = toGoldenCase(spread, 0, translators);
        const fr = toGoldenCase(spread, 1, translators);
        if (!("case" in en) || !("case" in fr)) throw new Error("expected cases");
        expect(fr.case.request.locale).toBe("fr");
        expect(fr.case.request.product.negatives).not.toEqual(en.case.request.product.negatives);
    });

    it("asks for Arabic output but keeps English facts on every 5th case", () => {
        const ar = toGoldenCase(spread, 4, translators);
        const en = toGoldenCase(spread, 0, translators);
        if (!("case" in ar) || !("case" in en)) throw new Error("expected cases");
        expect(ar.case.request.locale).toBe("ar");
        expect(ar.case.request.product.negatives).toEqual(en.case.request.product.negatives);
    });

    it("expects no alert for the decoy allergy", () => {
        const result = toGoldenCase(spread, 1, translators);
        if (!("case" in result)) throw new Error("expected a case");
        expect(result.case.request.user.allergies).toEqual(["sesame"]);
        expect(result.case.expect_alert).toEqual([]);
    });

    it("skips products that cannot make a good case", () => {
        expect(toGoldenCase({ ...spread, code: "12" }, 0, translators)).toEqual({ skipped: "no_barcode" });
        expect(toGoldenCase({ ...spread, product_name: undefined }, 0, translators)).toEqual({
            skipped: "no_name",
        });
        expect(toGoldenCase({ ...water, nutriments: { salt_100g: 0.1 } }, 0, translators)).toEqual({
            skipped: "too_little_data",
        });
    });
});

describe("buildGoldenSet", () => {
    it("counts skipped products and spreads languages over accepted cases only", () => {
        const products = [{ ...spread, code: "bad" }, spread, water, { ...water, code: "6111242100993" }];
        const { cases, skipped } = buildGoldenSet(products, translators);

        expect(skipped.no_barcode).toBe(1);
        expect(cases.map((c) => c.request.locale)).toEqual(["en", "fr", "en"]);
    });
});

describe("discoverProducts", () => {
    const response = (products: OFFProduct[], ok = true) =>
        ({ ok, status: ok ? 200 : 503, json: async () => ({ products }) }) as unknown as Response;

    it("queries each category with the needed fields and de-duplicates by barcode", async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(response([spread, water]))
            .mockResolvedValueOnce(response([spread, { ...water, code: "6111242100993" }]));
        const sleep = vi.fn().mockResolvedValue(undefined);

        const products = await discoverProducts({
            categories: ["en:spreads", "en:waters"],
            perCategory: 5,
            fetchImpl: fetchImpl as unknown as typeof fetch,
            sleep,
        });

        expect(products.map((p) => p.code)).toEqual(["3017620422003", "6111242100992", "6111242100993"]);
        const url = new URL(fetchImpl.mock.calls[0][0] as string);
        expect(url.searchParams.get("categories_tags")).toBe("en:spreads");
        expect(url.searchParams.get("countries_tags")).toBe("en:france");
        expect(url.searchParams.get("fields")).toBe(OFF_FIELDS);
        expect(sleep).toHaveBeenCalledTimes(1); // waits between searches, not before the first
    });

    it("limits products per category", async () => {
        const many = Array.from({ length: 10 }, (_, i) => ({ ...water, code: `61112421009${i}0` }));
        const fetchImpl = vi.fn().mockResolvedValue(response(many));
        const products = await discoverProducts({
            categories: ["en:waters"],
            perCategory: 3,
            fetchImpl: fetchImpl as unknown as typeof fetch,
        });
        expect(products).toHaveLength(3);
    });

    it("warns and carries on when a category fails", async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(response([], false))
            .mockRejectedValueOnce(new TypeError("fetch failed"))
            .mockResolvedValueOnce(response([spread]));
        const warnings: string[] = [];

        const products = await discoverProducts({
            categories: ["en:a", "en:b", "en:c"],
            fetchImpl: fetchImpl as unknown as typeof fetch,
            delayMs: 0,
            onWarn: (m) => warnings.push(m),
        });

        expect(products).toHaveLength(1);
        expect(warnings).toHaveLength(2);
        expect(warnings[0]).toContain("en:a: HTTP 503");
    });
});
