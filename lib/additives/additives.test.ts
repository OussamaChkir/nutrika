import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { PersonalProfile } from "../profiles/constants";
import { buildIndex, forYouNotes, getAdditiveInfo, normalizeAdditiveCode, productAdditiveCodes } from "./lookup";
import { ADDITIVES } from "./registry";
import { additiveInfoSchema, type AdditiveInfo } from "./schema";

const index = buildIndex(ADDITIVES);

const profile = (overrides: Partial<PersonalProfile> = {}): PersonalProfile => ({
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    ...overrides,
});

const valid = (): AdditiveInfo => JSON.parse(JSON.stringify(ADDITIVES[0]));

describe("knowledge base files", () => {
    const files = readdirSync(join(__dirname, "data")).filter((f) => f.endsWith(".json"));

    it("every data file is registered, and every registered entry has its file", () => {
        expect(ADDITIVES.map((a) => `${a.code.toLowerCase()}.json`).sort()).toEqual([...files].sort());
    });

    it("has one entry per code", () => {
        const codes = ADDITIVES.map((a) => a.code);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it.each(ADDITIVES.map((a) => [a.code, a] as const))("%s: calm wording and a real translation", (_code, a) => {
        const fields = [a.whatItIs, a.whyUsed, a.knownAndUnknown, ...a.forYou.map((f) => f.note)];
        // Tone rule: no fear words (a regulator's own wording is quoted, not invented).
        const banned = /\b(toxic|poison\w*|dangerous|deadly|harmful|killer|avoid at all costs)\b|toxique|poison|dangereu[xs]e?|mortel|nocif/i;
        for (const f of fields) {
            expect(f.en, `${a.code} en`).not.toMatch(banned);
            expect(f.fr, `${a.code} fr`).not.toMatch(banned);
            expect(f.fr, `${a.code}: FR is a copy of EN`).not.toBe(f.en);
        }
    });

    it.each(ADDITIVES.map((a) => [a.code, a] as const))("%s: sources are https links", (_code, a) => {
        expect(a.sources.length).toBeGreaterThan(0);
        for (const s of a.sources) expect(s.url.startsWith("https://")).toBe(true);
    });

    it("nothing in the repo is marked reviewed without a named human reviewer", () => {
        for (const a of ADDITIVES) {
            if (a.review.status === "reviewed") {
                expect(a.review.reviewer, a.code).toBeTruthy();
                expect(a.review.reviewedAt, a.code).toBeTruthy();
            }
        }
    });
});

describe("schema", () => {
    it("accepts a valid entry", () => {
        expect(additiveInfoSchema.safeParse(valid()).success).toBe(true);
    });

    it.each(["102", "E10", "e102", "E102x9", "E12345", "E102-tartrazine", ""])("rejects code %j", (code) => {
        expect(additiveInfoSchema.safeParse({ ...valid(), code }).success).toBe(false);
    });

    it("accepts codes with a letter suffix", () => {
        expect(additiveInfoSchema.safeParse({ ...valid(), code: "E150d" }).success).toBe(true);
        expect(additiveInfoSchema.safeParse({ ...valid(), code: "E160a" }).success).toBe(true);
    });

    it("requires reviewedAt and reviewer once reviewed", () => {
        const base = valid();
        expect(additiveInfoSchema.safeParse({ ...base, review: { status: "reviewed", reviewedAt: null, reviewer: null } }).success).toBe(false);
        expect(
            additiveInfoSchema.safeParse({ ...base, review: { status: "reviewed", reviewedAt: "2026-11-10", reviewer: "A. Dietitian" } }).success
        ).toBe(true);
    });

    it("rejects http sources, a missing source, unknown evidence and unknown keys", () => {
        const base = valid();
        expect(additiveInfoSchema.safeParse({ ...base, sources: [{ label: "EFSA opinion", url: "http://example.com" }] }).success).toBe(false);
        expect(additiveInfoSchema.safeParse({ ...base, sources: [] }).success).toBe(false);
        expect(additiveInfoSchema.safeParse({ ...base, evidence: "maybe" }).success).toBe(false);
        expect(additiveInfoSchema.safeParse({ ...base, surprise: true }).success).toBe(false);
    });

    it("rejects a For-you note aimed at something the app has no profile for", () => {
        const base = valid();
        const note = { en: "Not for people with phenylketonuria.", fr: "Pas pour les personnes phénylcétonuriques." };
        expect(additiveInfoSchema.safeParse({ ...base, forYou: [{ for: "phenylketonuria", note }] }).success).toBe(false);
        expect(additiveInfoSchema.safeParse({ ...base, forYou: [{ for: "child", note }] }).success).toBe(true);
    });
});

describe("normalizeAdditiveCode", () => {
    it.each([
        ["E102", "E102"],
        ["e102", "E102"],
        ["en:e102", "E102"],
        ["en:e150d", "E150d"],
        ["E150D", "E150d"],
        ["E150D-caramel", "E150d"],
        [" E 102 ", "E102"],
        ["fr:e160a", "E160a"],
    ])("%j -> %j", (raw, expected) => {
        expect(normalizeAdditiveCode(raw)).toBe(expected);
    });

    it.each(["", "citric acid", "E", "E1", "en:", "102", "E102a1b"])("%j is not an additive code", (raw) => {
        expect(normalizeAdditiveCode(raw)).toBeNull();
    });
});

describe("getAdditiveInfo", () => {
    it("never shows a draft by default: nothing unreviewed reaches users", () => {
        expect(ADDITIVES.some((a) => a.review.status === "draft")).toBe(true);
        for (const a of ADDITIVES.filter((x) => x.review.status === "draft")) {
            expect(getAdditiveInfo(index, a.code, "en")).toBeNull();
        }
    });

    it("shows drafts only when asked (development, Storybook)", () => {
        const view = getAdditiveInfo(index, "E102", "en", { includeDrafts: true });
        expect(view?.name).toBe("Tartrazine");
        expect(view?.sources.length).toBeGreaterThan(0);
        expect(view?.reviewed).toBe(false);
    });

    it("localizes, and accepts the formats Open Food Facts uses", () => {
        expect(getAdditiveInfo(index, "en:e211", "fr", { includeDrafts: true })?.name).toBe("Benzoate de sodium");
        expect(getAdditiveInfo(index, "E211", "en", { includeDrafts: true })?.name).toBe("Sodium benzoate");
    });

    it("returns null for unknown or malformed codes", () => {
        expect(getAdditiveInfo(index, "E999", "en", { includeDrafts: true })).toBeNull();
        expect(getAdditiveInfo(index, "salt", "en", { includeDrafts: true })).toBeNull();
    });

    it("shows a reviewed entry by default", () => {
        const reviewed: AdditiveInfo = {
            ...valid(),
            code: "E300",
            review: { status: "reviewed", reviewedAt: "2026-11-10", reviewer: "A. Dietitian" },
        };
        expect(getAdditiveInfo(buildIndex([reviewed]), "E300", "en")?.code).toBe("E300");
    });
});

describe("forYouNotes", () => {
    const view = (code: string) => getAdditiveInfo(index, code, "en", { includeDrafts: true })!;

    it("shows the child note only for the child age band", () => {
        expect(forYouNotes(view("E102"), profile({ ageBand: "child" }))).toHaveLength(1);
        expect(forYouNotes(view("E102"), profile({ ageBand: "adult" }))).toEqual([]);
        expect(forYouNotes(view("E102"), profile())).toEqual([]);
    });

    it("matches diets", () => {
        expect(forYouNotes(view("E120"), profile({ diets: ["vegan"] }))).toEqual(["Made from insects, so it is not vegan."]);
        expect(forYouNotes(view("E120"), profile({ diets: ["vegetarian"] }))).toHaveLength(1);
        expect(forYouNotes(view("E120"), profile({ diets: ["keto"] }))).toEqual([]);
    });

    it("shows nothing without a profile", () => {
        expect(forYouNotes(view("E120"), null)).toEqual([]);
    });
});

describe("productAdditiveCodes", () => {
    it("normalizes, de-duplicates, keeps order and drops junk", () => {
        expect(productAdditiveCodes(["E330", "en:e150d", "E330", "not-a-code", "E150D-caramel"])).toEqual(["E330", "E150d"]);
        expect(productAdditiveCodes([])).toEqual([]);
    });
});
