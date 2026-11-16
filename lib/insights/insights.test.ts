import { describe, expect, it } from "vitest";

import { normalizeOffProduct } from "../product";
import {
    buildInsights,
    categoryInsights,
    eventsForProfile,
    highSugarCount,
    proteinHabit,
    saltPattern,
    scoreTrend,
    topBrand,
    ultraProcessed,
    weekStart,
    weeklyScores,
    type TimedScan,
} from "./generators";
import { DAY_MS, MIN_SCANS, CHART_WEEKS } from "./rules";
import { buildScanEventData, isDuplicateScan, primaryBrand } from "./snapshot";

const NOW = Date.UTC(2026, 10, 4, 12, 0, 0); // Wed 4 Nov 2026

let n = 0;
const scan = (over: Partial<TimedScan> = {}, daysAgo = 1): TimedScan => ({
    barcode: `${100000 + n++}`,
    score: 60,
    grade: "C",
    sugar100: 5,
    salt100: 0.5,
    satFat100: 2,
    protein100: 5,
    nova: 3,
    category: "en:biscuits",
    brand: "Brand",
    highSugar: false,
    profileId: null,
    createdAt: NOW - daysAgo * DAY_MS,
    ...over,
});

/** `count` scans spread evenly over `days` days, oldest first, built by `make(i)`. */
const history = (count: number, days: number, make: (i: number) => Partial<TimedScan>): TimedScan[] =>
    Array.from({ length: count }, (_, i) => scan(make(i), days - (i * days) / count));

describe("empty and thin histories", () => {
    it("3 scans: an empty state with the count, never an insight", () => {
        const out = buildInsights(history(3, 5, () => ({ score: 90, highSugar: true })), NOW);
        expect(out).toMatchObject({ scanCount: 3, minScans: MIN_SCANS, enough: false, insights: [] });
    });
    it("no scans at all", () => {
        expect(buildInsights([], NOW)).toMatchObject({ scanCount: 0, enough: false, insights: [], chart: [] });
    });
    it("exactly the minimum is enough", () => {
        expect(buildInsights(history(MIN_SCANS, 10, () => ({})), NOW).enough).toBe(true);
        expect(buildInsights(history(MIN_SCANS - 1, 10, () => ({})), NOW).enough).toBe(false);
    });
});

describe("done when: 40 scans over 30 days", () => {
    const events = history(40, 30, (i) => ({
        score: 45 + Math.round((i / 39) * 35), // 45 -> 80: improving
        highSugar: i % 3 === 0,
        salt100: 1.2,
        protein100: i % 5 === 0 ? 4 : 14,
        nova: i % 2 === 0 ? 4 : 3,
        category: i % 2 === 0 ? "en:colas" : "en:cheeses",
        brand: i % 4 === 0 ? "Acme" : `B${i}`,
    }));
    const out = buildInsights(events, NOW);

    it("shows at least 3 insights", () => {
        expect(out.enough).toBe(true);
        expect(out.insights.length).toBeGreaterThanOrEqual(3);
    });
    it("they are the correct ones for this history", () => {
        const keys = out.insights.map((i) => i.key);
        expect(keys).toContain("scoreImproved");
        expect(keys).toContain("highSugarCount");
        expect(keys).toContain("proteinHabit");
        expect(keys).toContain("topBrand");
        expect(keys).not.toContain("scoreDropped");
        const high = out.insights.find((i) => i.key === "highSugarCount")!;
        expect(high.params.count).toBe(events.filter((e) => e.highSugar).length);
    });
    it("is deterministic and does not touch its input", () => {
        const snapshot = JSON.stringify(events);
        expect(JSON.stringify(buildInsights([...events].reverse(), NOW))).toBe(JSON.stringify(out));
        expect(JSON.stringify(events)).toBe(snapshot);
    });
});

describe("scoreTrend", () => {
    it("improved: compares the older half with the newer half", () => {
        const ev = history(10, 20, (i) => ({ score: i < 5 ? 61 : 74 }));
        expect(scoreTrend(ev)).toEqual({ key: "scoreImproved", severity: "positive", params: { from: 61, to: 74 } });
    });
    it("dropped", () => {
        const ev = history(10, 20, (i) => ({ score: i < 5 ? 80 : 60 }));
        expect(scoreTrend(ev)).toMatchObject({ key: "scoreDropped", severity: "notice", params: { from: 80, to: 60 } });
    });
    it("nothing when the change is small", () => {
        expect(scoreTrend(history(10, 20, (i) => ({ score: i < 5 ? 60 : 63 })))).toBeNull();
    });
    it("does not depend on the order events are given in", () => {
        const ev = history(10, 20, (i) => ({ score: i < 5 ? 50 : 70 }));
        expect(scoreTrend([...ev].reverse())).toEqual(scoreTrend(ev));
    });
    it("needs the minimum number of scans", () => {
        expect(scoreTrend(history(MIN_SCANS - 1, 20, (i) => ({ score: i < 4 ? 20 : 90 })))).toBeNull();
    });
});

describe("highSugarCount", () => {
    it("counts only the last 30 days and only known high-sugar scans", () => {
        const ev = [
            ...Array.from({ length: 3 }, () => scan({ highSugar: true }, 5)),
            scan({ highSugar: true }, 40), // too old
            scan({ highSugar: null }, 2), // unknown
            scan({ highSugar: false }, 2),
        ];
        expect(highSugarCount(ev, NOW)).toEqual({ key: "highSugarCount", severity: "notice", params: { count: 3, days: 30 } });
    });
    it("stays silent under the threshold", () => {
        expect(highSugarCount([scan({ highSugar: true }), scan({ highSugar: true })], NOW)).toBeNull();
    });
});

describe("saltPattern, proteinHabit, ultraProcessed need known values", () => {
    it("salt: averages known values, ignores missing, needs 5", () => {
        const ev = [1, 2, 3, 4, 5].map((s) => scan({ salt100: s })).concat([scan({ salt100: null })]);
        expect(saltPattern(ev)).toEqual({ key: "saltPattern", severity: "info", params: { avg: 3 } });
        expect(saltPattern(ev.slice(0, 4))).toBeNull();
    });
    it("protein: shown when most scans are high protein", () => {
        const high = Array.from({ length: 5 }, () => scan({ protein100: 12 }));
        expect(proteinHabit(high)).toMatchObject({ key: "proteinHabit", params: { percent: 100 } });
        const mixed = [...high.slice(0, 2), ...Array.from({ length: 3 }, () => scan({ protein100: 2 }))];
        expect(proteinHabit(mixed)).toBeNull();
    });
    it("ultra-processed: a share, a notice from 50%", () => {
        const half = [4, 4, 4, 1, 1].map((nova) => scan({ nova }));
        expect(ultraProcessed(half)).toEqual({ key: "ultraProcessed", severity: "notice", params: { percent: 60 } });
        const mostly = [4, 4, 4, 4, 1].map((nova) => scan({ nova }));
        expect(ultraProcessed(mostly)).toEqual({ key: "ultraProcessed", severity: "notice", params: { percent: 80 } });
        const few = [4, 1, 1, 1, 1].map((nova) => scan({ nova }));
        expect(ultraProcessed(few)).toEqual({ key: "ultraProcessed", severity: "info", params: { percent: 20 } });
        expect(ultraProcessed([4, 4, 4, 4].map((nova) => scan({ nova })))).toBeNull();
    });
});

describe("categoryInsights", () => {
    const cola = (s: number) => scan({ category: "en:colas", score: s });
    const cheese = (s: number) => scan({ category: "en:cheeses", score: s });
    it("names the best and the worst kind of product, in translatable aisle ids", () => {
        const ev = [cola(30), cola(40), cola(35), cheese(80), cheese(70), cheese(75)];
        const out = categoryInsights(ev);
        expect(out.map((i) => [i.key, i.aisle, i.params.avg])).toEqual([
            ["bestCategory", "dairy", 75],
            ["worstCategory", "drinks", 35],
        ]);
    });
    it("needs two categories with enough scans and a real gap", () => {
        expect(categoryInsights([cola(30), cola(40), cola(35)])).toEqual([]);
        expect(categoryInsights([cola(30), cola(40), cheese(80), cheese(70), cheese(75)])).toEqual([]);
        expect(categoryInsights([cola(60), cola(62), cola(61), cheese(63), cheese(64), cheese(65)])).toEqual([]);
    });
    it("ignores products that fall in no aisle", () => {
        const odd = (s: number) => scan({ category: "en:xyzzy", score: s });
        expect(categoryInsights([odd(10), odd(10), odd(10), cheese(80), cheese(80), cheese(80)])).toEqual([]);
    });
});

describe("topBrand", () => {
    it("finds the most scanned brand ignoring case", () => {
        const ev = [...Array.from({ length: 4 }, (_, i) => scan({ brand: i % 2 ? "acme" : "Acme" })), ...Array.from({ length: 6 }, (_, i) => scan({ brand: `Other${i}` }))];
        expect(topBrand(ev)).toEqual({ key: "topBrand", severity: "info", params: { brand: "Acme", count: 4 } });
    });
    it("silent when no brand stands out", () => {
        expect(topBrand(Array.from({ length: 10 }, (_, i) => scan({ brand: `B${i}` })))).toBeNull();
        expect(topBrand(Array.from({ length: 10 }, () => scan({ brand: null })))).toBeNull();
    });
});

describe("weeks and chart", () => {
    it("weeks start on Monday (UTC)", () => {
        expect(weekStart(Date.UTC(2026, 10, 4))).toBe("2026-11-02"); // Wed -> Mon 2 Nov
        expect(weekStart(Date.UTC(2026, 10, 2))).toBe("2026-11-02"); // Monday itself
        expect(weekStart(Date.UTC(2026, 10, 8, 23, 59))).toBe("2026-11-02"); // Sunday night
        expect(weekStart(Date.UTC(2026, 10, 9))).toBe("2026-11-09");
    });
    it("averages per week, oldest first, only weeks with scans", () => {
        const ev = [scan({ score: 40 }, 1), scan({ score: 60 }, 1), scan({ score: 80 }, 15)];
        const points = weeklyScores(ev);
        expect(points).toHaveLength(2);
        expect(points[0].week < points[1].week).toBe(true);
        expect(points[0]).toMatchObject({ average: 80, scans: 1 });
        expect(points[1]).toMatchObject({ average: 50, scans: 2 });
    });
    it("keeps only the latest weeks", () => {
        const ev = Array.from({ length: 30 }, (_, w) => scan({ score: 50 }, w * 7));
        expect(weeklyScores(ev)).toHaveLength(CHART_WEEKS);
    });
});

describe("eventsForProfile", () => {
    const ev = [{ profileId: "a" }, { profileId: "b" }, { profileId: null }];
    it("a profile sees its own scans and the scans made before profiles existed", () => {
        expect(eventsForProfile(ev, "a")).toEqual([{ profileId: "a" }, { profileId: null }]);
    });
    it("without a profile, everything", () => expect(eventsForProfile(ev, null)).toHaveLength(3));
});

describe("buildScanEventData", () => {
    const product = (nut: Record<string, number>, extra = {}) =>
        normalizeOffProduct({ code: "123456789", product_name: "X", brands: "Nestle, Maggi", nova_group: 4, categories_tags: ["en:snacks", "en:biscuits"], nutriments: nut, ...extra });

    it("snapshots the nutrients, the category, the first brand and the NOVA group", () => {
        const data = buildScanEventData(product({ sugars_100g: 30, salt_100g: 0.4, "saturated-fat_100g": 8, proteins_100g: 6 }), { score: 41.4, grade: "D" }, "p1");
        expect(data).toEqual({
            barcode: "123456789", score: 41, grade: "D", sugar100: 30, salt100: 0.4, satFat100: 8, protein100: 6,
            nova: 4, category: "en:biscuits", brand: "Nestle", highSugar: true, profileId: "p1",
        });
    });
    it("uses the category's own sugar threshold: 5 g is high for a drink, not for a snack", () => {
        const drink = product({ sugars_100g: 5 }, { categories_tags: ["en:beverages", "en:sodas"] });
        expect(buildScanEventData(drink, { score: 50, grade: "C" }, null).highSugar).toBe(true);
        expect(buildScanEventData(product({ sugars_100g: 5 }), { score: 50, grade: "C" }, null).highSugar).toBe(false);
    });
    it("unknown sugar stays unknown, never zero", () => {
        const data = buildScanEventData(normalizeOffProduct({ code: "123456789", product_name: "X" }), { score: 50, grade: "C" }, null);
        expect(data).toMatchObject({ sugar100: null, salt100: null, highSugar: null, nova: null, category: null, brand: null });
    });
    it("rejects an impossible NOVA group", () => {
        expect(buildScanEventData(product({}, { nova_group: 9 }), { score: 1, grade: "E" }, null).nova).toBeNull();
    });
});

describe("primaryBrand and isDuplicateScan", () => {
    it("takes the first brand", () => {
        expect(primaryBrand(" Nestle ,Maggi")).toBe("Nestle");
        expect(primaryBrand("")).toBeNull();
        expect(primaryBrand(null)).toBeNull();
        expect(primaryBrand(undefined)).toBeNull();
    });
    it("the same product within 10 minutes is a duplicate", () => {
        expect(isDuplicateScan(NOW - 60_000, NOW)).toBe(true);
        expect(isDuplicateScan(NOW - 11 * 60_000, NOW)).toBe(false);
        expect(isDuplicateScan(null, NOW)).toBe(false);
        expect(isDuplicateScan(undefined, NOW)).toBe(false);
    });
    it("a timestamp in the future is not treated as a duplicate", () => {
        expect(isDuplicateScan(NOW + 60_000, NOW)).toBe(false);
    });
});
