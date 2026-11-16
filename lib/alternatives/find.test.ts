import { describe, expect, it, vi } from "vitest";

import type { OFFProduct } from "../openfoodfacts";
import { normalizeOffProduct } from "../product";
import { scoreProduct } from "../scoring";
import { findAlternatives, MAX_CATEGORIES, MIN_WANTED } from "./find";
import { MAX_ALTERNATIVES } from "./rank";

const off = (code: string, good: boolean, extra: Partial<OFFProduct> = {}): OFFProduct => ({
    code,
    product_name: `Product ${code}`,
    ingredients_text: "Oats, water",
    nutriments: good
        ? { sugars_100g: 2, "saturated-fat_100g": 0.5, salt_100g: 0.1, fat_100g: 4, carbohydrates_100g: 40, proteins_100g: 8 }
        : { sugars_100g: 40, "saturated-fat_100g": 12, salt_100g: 2.5, fat_100g: 30, carbohydrates_100g: 60, proteins_100g: 3 },
    ...extra,
});

const current = normalizeOffProduct(
    off("1", false, { categories_tags: ["en:snacks", "en:biscuits", "en:chocolate-biscuits", "en:filled-biscuits"] })
);
const input = { current, currentScore: scoreProduct(current).score, profile: null, country: null as string | null };

describe("findAlternatives", () => {
    it("tries the most specific categories first, at most MAX_CATEGORIES", async () => {
        const fetcher = vi.fn().mockResolvedValue([]);
        await findAlternatives(input, fetcher);
        const asked = fetcher.mock.calls.map((c) => c[0].category);
        expect(asked).toEqual(["en:filled-biscuits", "en:chocolate-biscuits", "en:biscuits"]);
        expect(asked.length).toBe(MAX_CATEGORIES);
    });

    it("returns closer-category results first and stops at the maximum", async () => {
        const fetcher = vi.fn().mockImplementation(async ({ category }) =>
            category === "en:filled-biscuits"
                ? [off("10", true), off("11", true)]
                : Array.from({ length: 10 }, (_, i) => off(`2${i}`, true))
        );
        const out = await findAlternatives(input, fetcher);
        expect(out).toHaveLength(MAX_ALTERNATIVES);
        expect(out.slice(0, 2).map((a) => a.barcode).sort()).toEqual(["10", "11"]);
        expect(new Set(out.map((a) => a.barcode)).size).toBe(out.length);
    });

    it("does not call further categories once it has enough", async () => {
        const fetcher = vi.fn().mockResolvedValue(Array.from({ length: 10 }, (_, i) => off(`3${i}`, true)));
        await findAlternatives(input, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("excludes the scanned product and products that are not better", async () => {
        const fetcher = vi.fn().mockResolvedValue([off("1", true), off("40", false), off("41", true)]);
        const out = await findAlternatives(input, fetcher);
        expect(out.map((a) => a.barcode)).toEqual(["41"]);
    });

    it("searches the configured country first, then widens when there are too few", async () => {
        const fetcher = vi.fn().mockImplementation(async ({ country }) =>
            country ? [off("50", true, { countries_tags: ["en:tunisia"] })] : [off("51", true, { countries_tags: ["en:france"] })]
        );
        const out = await findAlternatives({ ...input, country: "en:tunisia" }, fetcher);
        expect(fetcher.mock.calls[0][0].country).toBe("en:tunisia");
        expect(fetcher.mock.calls.some((c) => c[0].country === undefined)).toBe(true);
        expect(out.map((a) => a.barcode)).toContain("50");
        expect(out.map((a) => a.barcode)).toContain("51");
        // Local products first.
        expect(out[0].barcode).toBe("50");
    });

    it("does not widen when the country already gives enough", async () => {
        const fetcher = vi.fn().mockImplementation(async ({ country }) => {
            if (!country) throw new Error("should not widen");
            return Array.from({ length: MIN_WANTED + 2 }, (_, i) => off(`6${i}`, true));
        });
        const out = await findAlternatives({ ...input, country: "en:tunisia" }, fetcher);
        expect(out.length).toBeGreaterThanOrEqual(MIN_WANTED);
    });

    it("ignores an invalid country instead of sending it to OFF", async () => {
        const fetcher = vi.fn().mockResolvedValue([]);
        await findAlternatives({ ...input, country: "tunisia&x=1" }, fetcher);
        for (const call of fetcher.mock.calls) expect(call[0].country).toBeUndefined();
    });

    it("returns nothing for a product without categories, without calling OFF", async () => {
        const fetcher = vi.fn();
        const bare = normalizeOffProduct(off("2", false));
        expect(await findAlternatives({ ...input, current: bare }, fetcher)).toEqual([]);
        expect(fetcher).not.toHaveBeenCalled();
    });
});
