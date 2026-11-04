// F9: insight generators. Each one is a pure function: events in, an insight or null out
// (null means "not enough data", never a fake insight). Messages live in messages/*.json under
// Insights.items.<key>, with the params below.
//
// Wording rule: say "products you scanned", never "your intake". No medical claims.

import { aisleFor, type Aisle } from "../shopping/aisle";
import {
    BRAND_MIN_COUNT,
    BRAND_MIN_SHARE,
    CATEGORY_MIN_GAP,
    CHART_WEEKS,
    DAY_MS,
    HIGH_PROTEIN_G,
    HIGH_SUGAR_MIN_COUNT,
    MIN_CATEGORY_SCANS,
    MIN_KNOWN_VALUES,
    MIN_SCANS,
    PROTEIN_HABIT_SHARE,
    RECENT_DAYS,
    TREND_MIN_DELTA,
    ULTRA_PROCESSED_NOTICE_SHARE,
} from "./rules";
import type { ScanEventData } from "./snapshot";

export type InsightKey =
    | "scoreImproved"
    | "scoreDropped"
    | "highSugarCount"
    | "ultraProcessed"
    | "saltPattern"
    | "proteinHabit"
    | "bestCategory"
    | "worstCategory"
    | "topBrand";

export type InsightSeverity = "positive" | "info" | "notice";

export interface Insight {
    key: InsightKey;
    severity: InsightSeverity;
    params: Record<string, string | number>;
    /** For category insights: the aisle id, which the UI turns into a translated name. */
    aisle?: Aisle;
}

export interface TimedScan extends ScanEventData {
    createdAt: Date | string | number;
}

export interface ChartPoint {
    /** ISO date (YYYY-MM-DD) of the Monday that starts the week, UTC. */
    week: string;
    average: number;
    scans: number;
}

export interface InsightsResult {
    scanCount: number;
    minScans: number;
    /** False until MIN_SCANS scans: show the encouraging empty state. */
    enough: boolean;
    insights: Insight[];
    chart: ChartPoint[];
}

const t = (e: TimedScan) => new Date(e.createdAt).getTime();
const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const round = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function scoreTrend(events: readonly TimedScan[]): Insight | null {
    if (events.length < MIN_SCANS) return null;
    const sorted = [...events].sort((a, b) => t(a) - t(b));
    const half = Math.floor(sorted.length / 2);
    const from = round(avg(sorted.slice(0, half).map((e) => e.score)));
    const to = round(avg(sorted.slice(sorted.length - half).map((e) => e.score)));
    if (to - from >= TREND_MIN_DELTA) return { key: "scoreImproved", severity: "positive", params: { from, to } };
    if (from - to >= TREND_MIN_DELTA) return { key: "scoreDropped", severity: "notice", params: { from, to } };
    return null;
}

export function highSugarCount(events: readonly TimedScan[], now: Date | number): Insight | null {
    const since = new Date(now).getTime() - RECENT_DAYS * DAY_MS;
    const count = events.filter((e) => e.highSugar === true && t(e) >= since).length;
    return count >= HIGH_SUGAR_MIN_COUNT ? { key: "highSugarCount", severity: "notice", params: { count, days: RECENT_DAYS } } : null;
}

export function saltPattern(events: readonly TimedScan[]): Insight | null {
    const known = events.map((e) => e.salt100).filter(isNum);
    return known.length >= MIN_KNOWN_VALUES ? { key: "saltPattern", severity: "info", params: { avg: round1(avg(known)) } } : null;
}

export function proteinHabit(events: readonly TimedScan[]): Insight | null {
    const known = events.map((e) => e.protein100).filter(isNum);
    if (known.length < MIN_KNOWN_VALUES) return null;
    const share = known.filter((p) => p >= HIGH_PROTEIN_G).length / known.length;
    return share >= PROTEIN_HABIT_SHARE
        ? { key: "proteinHabit", severity: "positive", params: { percent: round(share * 100), grams: HIGH_PROTEIN_G } }
        : null;
}

export function ultraProcessed(events: readonly TimedScan[]): Insight | null {
    const known = events.map((e) => e.nova).filter(isNum);
    if (known.length < MIN_KNOWN_VALUES) return null;
    const share = known.filter((n) => n === 4).length / known.length;
    return {
        key: "ultraProcessed",
        severity: share >= ULTRA_PROCESSED_NOTICE_SHARE ? "notice" : "info",
        params: { percent: round(share * 100) },
    };
}

/** Best and worst kind of product by average score, grouped by aisle so names can be translated. */
export function categoryInsights(events: readonly TimedScan[]): Insight[] {
    const groups = new Map<Aisle, number[]>();
    for (const e of events) {
        const aisle = aisleFor(e.category);
        if (aisle === "other") continue;
        groups.set(aisle, [...(groups.get(aisle) ?? []), e.score]);
    }
    const rows = [...groups.entries()]
        .filter(([, scores]) => scores.length >= MIN_CATEGORY_SCANS)
        .map(([aisle, scores]) => ({ aisle, average: round(avg(scores)), scans: scores.length }))
        // Stable: score, then more scans, then aisle id.
        .sort((a, b) => b.average - a.average || b.scans - a.scans || a.aisle.localeCompare(b.aisle));
    if (rows.length < 2) return [];
    const best = rows[0];
    const worst = rows[rows.length - 1];
    if (best.average - worst.average < CATEGORY_MIN_GAP) return [];
    return [
        { key: "bestCategory", severity: "positive", aisle: best.aisle, params: { avg: best.average, scans: best.scans } },
        { key: "worstCategory", severity: "info", aisle: worst.aisle, params: { avg: worst.average, scans: worst.scans } },
    ];
}

export function topBrand(events: readonly TimedScan[]): Insight | null {
    const withBrand = events.filter((e) => e.brand);
    const counts = new Map<string, { name: string; count: number }>();
    for (const e of withBrand) {
        const key = e.brand!.toLowerCase();
        const entry = counts.get(key) ?? { name: e.brand!, count: 0 };
        counts.set(key, { ...entry, count: entry.count + 1 });
    }
    const top = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
    if (!top || top.count < BRAND_MIN_COUNT || top.count / events.length < BRAND_MIN_SHARE) return null;
    return { key: "topBrand", severity: "info", params: { brand: top.name, count: top.count } };
}

/** Monday (UTC) of the week containing `ms`, as YYYY-MM-DD. */
export function weekStart(ms: number): string {
    const d = new Date(ms);
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

/** Average score per week, oldest first, only weeks with scans, at most CHART_WEEKS. */
export function weeklyScores(events: readonly TimedScan[]): ChartPoint[] {
    const weeks = new Map<string, number[]>();
    for (const e of events) {
        const key = weekStart(t(e));
        weeks.set(key, [...(weeks.get(key) ?? []), e.score]);
    }
    return [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-CHART_WEEKS)
        .map(([week, scores]) => ({ week, average: round(avg(scores)), scans: scores.length }));
}

/** Everything the Insights page needs. Fewer than MIN_SCANS scans: no insights, just the count. */
export function buildInsights(events: readonly TimedScan[], now: Date | number): InsightsResult {
    const base = { scanCount: events.length, minScans: MIN_SCANS, chart: weeklyScores(events) };
    if (events.length < MIN_SCANS) return { ...base, enough: false, insights: [] };
    const insights = [
        scoreTrend(events),
        highSugarCount(events, now),
        ultraProcessed(events),
        saltPattern(events),
        proteinHabit(events),
        ...categoryInsights(events),
        topBrand(events),
    ].filter((i): i is Insight => i !== null);
    return { ...base, enough: true, insights };
}

/**
 * Scans made with this profile, plus scans made before any profile existed (no profile id),
 * which belong to the account and are shared by its profiles.
 */
export function eventsForProfile<T extends { profileId: string | null }>(events: readonly T[], profileId: string | null): T[] {
    if (!profileId) return [...events];
    return events.filter((e) => e.profileId === null || e.profileId === profileId);
}
