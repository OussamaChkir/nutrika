import { describe, expect, it, vi } from "vitest";

// search.ts imports the database client; these tests only use its pure sortResults().
vi.mock("../db", () => ({ prisma: {} }));

import { productFromStored } from "../product";
import { buildProductDetail, buildShoppingState, type CatalogRow } from "./detail";
import { buildPersonalView, type ProfileRow } from "./personal";
import { sortResults, type SearchResult } from "./search";

const row: CatalogRow = {
    barcode: "3017620422003",
    name: "Hazelnut spread",
    brand: "Brand",
    imageUrl: null,
    status: "APPROVED",
    score: 32,
    scoreLetter: "D",
    scoreColor: "#f97316",
    allergens: ["Peanuts", "Milk"],
    allergensSeverity: "HIGH",
    dietaryTags: ["vegetarian"],
    energy: 539,
    fat: 30.9,
    saturatedFat: 10.6,
    carbohydrates: 57.5,
    sugars: 56.3,
    fiber: null,
    proteins: 6.3,
    salt: 0.107,
    manufacturingPlaces: null,
    origins: null,
};

const normalized = productFromStored({
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    imageUrl: null,
    offData: null,
    allergens: ["Peanuts", "Milk"],
    sugars: row.sugars,
    saturatedFat: row.saturatedFat,
    salt: row.salt,
    proteins: row.proteins,
    fat: row.fat,
    carbohydrates: row.carbohydrates,
});

const profile = (id: string, over: Partial<ProfileRow> = {}): ProfileRow => ({
    id,
    name: `P-${id}`,
    ageBand: "adult",
    isDefault: false,
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...over,
});

const base = {
    row,
    normalized,
    positives: [],
    negatives: [{ key: "highSugar", params: { value: 56.3 } }],
    isFavorite: false,
    legacyAllergies: [] as string[],
    personal: null,
    activeProfile: null,
    shopping: null,
    additiveLocale: "en" as const,
    additivesEnabled: false,
    includeDraftAdditives: false,
};

describe("buildPersonalView", () => {
    const a = profile("a".repeat(24), { name: "Me", isDefault: true });
    const b = profile("b".repeat(24), { name: "Nour", allergens: ["Peanuts"] });

    it("returns null when the user has no profile", () => {
        expect(buildPersonalView(normalized, 32, [], null)).toBeNull();
    });

    it("uses the default profile when no hint is sent", () => {
        const built = buildPersonalView(normalized, 32, [a, b], null)!;
        expect(built.view.activeProfileId).toBe(a.id);
        expect(built.view.everyone.map((r) => r.isActive)).toEqual([true, false]);
    });

    it("honors a hint that is one of the user's own profiles", () => {
        expect(buildPersonalView(normalized, 32, [a, b], b.id)!.view.activeProfileId).toBe(b.id);
    });

    it("ignores a hint that is not the user's (someone else's profile id selects nothing)", () => {
        const foreign = "f".repeat(24);
        expect(buildPersonalView(normalized, 32, [a, b], foreign)!.view.activeProfileId).toBe(a.id);
    });

    it("evaluates every profile, and an allergen match is not_suitable", () => {
        const built = buildPersonalView(normalized, 32, [a, b], null)!;
        const nour = built.view.everyone.find((r) => r.profileId === b.id)!;
        expect(nour.verdict.status).toBe("not_suitable");
        expect(nour.verdict.personalScore ?? 0).toBeLessThanOrEqual(20);
        expect(built.view.everyone.find((r) => r.profileId === a.id)!.verdict.universalScore).toBe(32);
    });
});

describe("buildProductDetail", () => {
    it("shapes the universal answer and keeps message keys untranslated", () => {
        const detail = buildProductDetail(base);
        expect(detail).toMatchObject({
            barcode: row.barcode,
            score: { value: 32, letter: "D", color: "#f97316" },
            negatives: [{ key: "highSugar", params: { value: 56.3 } }],
            personal: null,
            shopping: null,
            additives: [],
            isFavorite: false,
        });
        expect(detail.allergens).toEqual([
            { name: "Peanuts", severity: "HIGH" },
            { name: "Milk", severity: "HIGH" },
        ]);
        expect(detail.nutrients.sugars).toBe(56.3);
    });

    it("flags allergens from the older account-level allergy list", () => {
        expect(buildProductDetail({ ...base, legacyAllergies: ["peanut"] }).allergyAlert).toEqual(["Peanuts"]);
        expect(buildProductDetail({ ...base, legacyAllergies: ["gluten"] }).allergyAlert).toEqual([]);
    });

    it("never includes user ids or internal fields", () => {
        const json = JSON.stringify(buildProductDetail(base));
        expect(json).not.toMatch(/userId|createdById|offData|passwordHash/);
    });

    it("does not fail when additives are enabled but no explanation is reviewed", () => {
        expect(buildProductDetail({ ...base, additivesEnabled: true }).additives).toEqual([]);
    });
});

describe("buildShoppingState", () => {
    const input = {
        barcode: row.barcode,
        category: "en:spreads",
        sugars: 56,
        salt: 0.1,
        saturatedFat: 10,
        state: null,
        onList: true,
        peers: [{ barcode: "111111111111", category: "en:spreads", sugars: 30, salt: 0.1, saturatedFat: 10 }],
        verdictStatus: null,
    };

    it("flags more sugar than the product the user usually buys", () => {
        const state = buildShoppingState(input);
        expect(state.onList).toBe(true);
        expect(state.flags.map((f) => f.kind)).toEqual(["moreSugar"]);
    });

    it("never shows a plain 'approved' when the personal verdict is red", () => {
        const state = buildShoppingState({ ...input, state: "approved", verdictStatus: "not_suitable" });
        expect(state.flags.map((f) => f.kind)).toEqual(["approvedButCheck"]);
    });

    it("shows avoid on its own state", () => {
        expect(buildShoppingState({ ...input, state: "avoid", peers: [] }).flags[0]).toMatchObject({ kind: "avoid", severity: "warning" });
    });
});

describe("sortResults", () => {
    const items: SearchResult[] = [
        { barcode: "1", name: "Banana", source: "database", score: 90 },
        { barcode: "2", name: "apple", source: "openfoodfacts" },
        { barcode: "3", name: "Cola", source: "database", score: 5 },
    ];

    it("sorts by name or score (a missing score counts as 50) without changing the input", () => {
        const copy = [...items];
        expect(sortResults(items, "name_asc").map((r) => r.barcode)).toEqual(["2", "1", "3"]);
        expect(sortResults(items, "score_desc").map((r) => r.barcode)).toEqual(["1", "2", "3"]);
        expect(sortResults(items, "score_asc").map((r) => r.barcode)).toEqual(["3", "2", "1"]);
        expect(items).toEqual(copy);
    });

    it("leaves the order alone for no or an unknown sort", () => {
        expect(sortResults(items, null)).toBe(items);
        expect(sortResults(items, "weird").map((r) => r.barcode)).toEqual(["1", "2", "3"]);
    });
});
