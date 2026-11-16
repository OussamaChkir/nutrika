import { describe, expect, it } from "vitest";

import { normalizeOffProduct } from "../product";
import {
    DAY_MS,
    describeAge,
    isCacheable,
    isValidBarcode,
    looksLikeProduct,
    MAX_QUEUE,
    planEnqueue,
    planEviction,
    STALE_AFTER_DAYS,
} from "./policy";

const product = (code = "3017620422003") => normalizeOffProduct({ code, product_name: "Spread", ingredients_text: "Sugar", nutriments: { sugars_100g: 56 } });

describe("isValidBarcode", () => {
    it.each(["12345678", "3017620422003", "12345678901234"])("accepts %s", (v) => expect(isValidBarcode(v)).toBe(true));
    it.each(["1234567", "123456789012345", "30176204220a3", "", " 3017620422003", "../etc", 3017620422003, null, undefined])("refuses %j", (v) => expect(isValidBarcode(v)).toBe(false));
});

describe("planEviction (least recently used first)", () => {
    const entry = (barcode: string, lastUsedAt: number, fetchedAt = 0) => ({ barcode, lastUsedAt, fetchedAt });

    it("keeps everything under the limit", () => {
        expect(planEviction([entry("a", 1), entry("b", 2)], 2)).toEqual([]);
    });

    it("removes the least recently used ones, exactly as many as needed", () => {
        const items = [entry("a", 30), entry("b", 10), entry("c", 20), entry("d", 40)];
        expect(planEviction(items, 2)).toEqual(["b", "c"]);
        expect(planEviction(items, 3)).toEqual(["b"]);
    });

    it("breaks ties by oldest fetch, then by barcode, so the result is deterministic", () => {
        const items = [entry("b", 5, 2), entry("a", 5, 2), entry("c", 5, 1)];
        expect(planEviction(items, 1)).toEqual(["c", "a"]);
    });

    it("does not mutate its input", () => {
        const items = [entry("a", 3), entry("b", 1)];
        planEviction(items, 1);
        expect(items.map((i) => i.barcode)).toEqual(["a", "b"]);
    });
});

describe("describeAge", () => {
    const now = 1_700_000_000_000;
    it.each([
        [0, { unit: "justNow", value: 0 }],
        [59_000, { unit: "justNow", value: 0 }],
        [5 * 60_000, { unit: "minutes", value: 5 }],
        [3 * 60 * 60_000, { unit: "hours", value: 3 }],
        [3 * DAY_MS, { unit: "days", value: 3 }],
        [3 * DAY_MS + 23 * 60 * 60_000, { unit: "days", value: 3 }],
    ])("%i ms ago", (ago, expected) => {
        expect(describeAge(now - ago, now)).toMatchObject({ ...expected, stale: false });
    });

    it("marks data older than 30 days as stale, and not before", () => {
        expect(describeAge(now - STALE_AFTER_DAYS * DAY_MS, now).stale).toBe(false);
        expect(describeAge(now - STALE_AFTER_DAYS * DAY_MS - 1, now).stale).toBe(true);
    });

    it("treats a date in the future (wrong clock) as just now, never negative", () => {
        expect(describeAge(now + 5 * DAY_MS, now)).toMatchObject({ unit: "justNow", value: 0 });
    });
});

describe("planEnqueue", () => {
    it("adds a barcode once", () => {
        const first = planEnqueue([], "3017620422003", 100);
        expect(first.added).toBe(true);
        expect(planEnqueue(first.queue, "3017620422003", 200)).toMatchObject({ added: false });
    });

    it("refuses an invalid barcode", () => {
        expect(planEnqueue([], "abc", 1)).toEqual({ queue: [], added: false });
    });

    it("never exceeds the cap: the oldest entry makes room", () => {
        let queue: ReturnType<typeof planEnqueue>["queue"] = [];
        for (let i = 0; i < MAX_QUEUE + 5; i++) queue = planEnqueue(queue, String(10000000 + i), i).queue;
        expect(queue).toHaveLength(MAX_QUEUE);
        expect(queue[0].barcode).toBe(String(10000005));
        expect(queue.at(-1)!.barcode).toBe(String(10000000 + MAX_QUEUE + 4));
    });
});

describe("what may be kept, what may be trusted", () => {
    it("only approved products with a valid barcode are cacheable", () => {
        expect(isCacheable({ barcode: "3017620422003" }, "APPROVED")).toBe(true);
        expect(isCacheable({ barcode: "3017620422003" }, "PENDING")).toBe(false);
        expect(isCacheable({ barcode: "3017620422003" }, undefined)).toBe(false);
        expect(isCacheable({ barcode: "bad" }, "APPROVED")).toBe(false);
    });

    it("looksLikeProduct accepts a real product and refuses damaged ones", () => {
        expect(looksLikeProduct(product())).toBe(true);
        expect(looksLikeProduct(null)).toBe(false);
        expect(looksLikeProduct("x")).toBe(false);
        expect(looksLikeProduct({ ...product(), allergens: "peanuts" })).toBe(false);
        expect(looksLikeProduct({ ...product(), barcode: "x" })).toBe(false);
        expect(looksLikeProduct({ ...product(), nutrients: null })).toBe(false);
        const rest: Partial<ReturnType<typeof product>> = { ...product() };
        delete rest.ingredientsStatus;
        expect(looksLikeProduct(rest)).toBe(false);
    });
});
