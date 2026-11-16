import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { AISLES } from "../shopping/aisle";
import { buildInsights, type InsightKey, type InsightSeverity, type TimedScan } from "./generators";
import { DAY_MS, MIN_SCANS, RETENTION_DAYS } from "./rules";

const paths = (obj: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
const get = (root: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)?.[k], root);

const KEYS: InsightKey[] = ["scoreImproved", "scoreDropped", "highSugarCount", "ultraProcessed", "saltPattern", "proteinHabit", "bestCategory", "worstCategory", "topBrand"];
const SEVERITIES: InsightSeverity[] = ["positive", "notice", "info"];

describe("Insights messages", () => {
    it("EN and FR have the same keys and placeholders, none empty", () => {
        const enPaths = paths(en.Insights).sort();
        expect(paths(fr.Insights).sort()).toEqual(enPaths);
        for (const path of enPaths) {
            expect(String(get(en.Insights, path)).length, `en ${path}`).toBeGreaterThan(0);
            expect(String(get(fr.Insights, path)).length, `fr ${path}`).toBeGreaterThan(0);
            expect(placeholders(String(get(fr.Insights, path))), path).toEqual(placeholders(String(get(en.Insights, path))));
        }
    });

    it("has a message and a severity label for every insight the generators can produce", () => {
        for (const locale of [en, fr]) {
            for (const k of KEYS) expect(locale.Insights.items, k).toHaveProperty(k);
            for (const s of SEVERITIES) expect(locale.Insights.severity, s).toHaveProperty(s);
            expect(locale.Header.insights.length).toBeGreaterThan(0);
        }
    });

    it("every message can be filled with exactly the params its generator gives", () => {
        // A history that makes every generator fire.
        const events: TimedScan[] = Array.from({ length: 40 }, (_, i) => ({
            barcode: `${i}`, score: 40 + i, grade: "C", sugar100: 20, salt100: 1, satFat100: 2,
            protein100: i % 5 === 0 ? 3 : 15, nova: 4, category: i % 2 ? "en:colas" : "en:cheeses",
            brand: i % 3 === 0 ? "Acme" : `B${i}`, highSugar: true, profileId: null,
            createdAt: Date.UTC(2026, 10, 4) - (40 - i) * 0.7 * DAY_MS,
        }));
        const result = buildInsights(events, Date.UTC(2026, 10, 4));
        expect(result.insights.length).toBeGreaterThanOrEqual(6);
        for (const insight of result.insights) {
            const given = [...Object.keys(insight.params), ...(insight.aisle ? ["aisle"] : [])].map((k) => `{${k}}`).sort();
            for (const locale of [en, fr]) {
                const message = (locale.Insights.items as Record<string, string>)[insight.key];
                expect(placeholders(message), `${insight.key}`).toEqual(given);
            }
        }
    });

    it("category insights name aisles the UI can translate", () => {
        for (const locale of [en, fr]) for (const a of AISLES) expect(locale.Shopping.aisles, a).toHaveProperty(a);
    });

    it("the texts match the real numbers: minimum scans and retention", () => {
        expect(MIN_SCANS).toBe(10);
        expect(RETENTION_DAYS).toBe(365);
        expect(en.Insights.optIn.text).toMatch(/12 months/);
        expect(fr.Insights.optIn.text).toMatch(/12 mois/);
        expect(en.Privacy.collectList8).toMatch(/12 months/);
        expect(fr.Privacy.collectList8).toMatch(/12 mois/);
    });

    it("never talks about intake or eating as a fact: only about scans", () => {
        for (const locale of [en, fr]) {
            for (const text of Object.values(locale.Insights.items)) expect(text).not.toMatch(/\b(you eat|you ate|intake|your diet|vous mangez|apport)\b/i);
        }
    });
});
