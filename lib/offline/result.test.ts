import { describe, expect, it } from "vitest";

import { normalizeOffProduct } from "../product";
import type { PersonalProfile } from "../profiles/constants";
import { evaluateProduct } from "../profiles/evaluate";
import { scoreProduct } from "../scoring";
import { DAY_MS, type CachedProduct, type ProfileSnapshot } from "./policy";
import { buildOfflineResult } from "./result";

const NOW = 1_800_000_000_000;
const cached = (over: Parameters<typeof normalizeOffProduct>[0], fetchedAt = NOW - 3 * DAY_MS): CachedProduct => ({
    barcode: over.code!,
    product: normalizeOffProduct(over),
    fetchedAt,
    lastUsedAt: fetchedAt,
    source: "scan",
});

const peanutProfile: PersonalProfile = { conditions: [], diets: [], goals: [], allergens: ["Peanuts"], allergenStrictness: "avoid_traces", ageBand: "adult" };
const diabetesProfile: PersonalProfile = { conditions: ["diabetes"], diets: [], goals: [], allergens: [], allergenStrictness: "avoid_traces", ageBand: "adult" };
const profiles: ProfileSnapshot[] = [
    { id: "p1", name: "Sami", isDefault: true, profile: peanutProfile },
    { id: "p2", name: "Dad", isDefault: false, profile: diabetesProfile },
];

const biscuit = { code: "20000001", product_name: "Biscuit", ingredients_text: "Flour, sugar, peanuts, salt", allergens_tags: ["en:peanuts"], nutriments: { sugars_100g: 30, salt_100g: 0.5, "saturated-fat_100g": 5, fat_100g: 15, carbohydrates_100g: 60, proteins_100g: 6 } };

describe("buildOfflineResult", () => {
    it("gives the same score and verdicts as the online engines (done-when: a full verdict offline)", () => {
        const c = cached(biscuit);
        const r = buildOfflineResult(c, profiles, "p1", NOW);
        const onlineScore = scoreProduct(c.product);
        expect(r.score.score).toBe(onlineScore.score);
        expect(r.verdicts[0].verdict).toEqual(evaluateProduct(c.product, peanutProfile, onlineScore.score));
        expect(r.verdicts[0].verdict.status).toBe("not_suitable");
        expect(r.verdicts[0].verdict.allergenState).toBe("contains");
        expect(r.verdicts).toHaveLength(2);
    });

    it("shows how old the saved data is", () => {
        expect(buildOfflineResult(cached(biscuit), profiles, "p1", NOW).age).toEqual({ unit: "days", value: 3, stale: false });
        expect(buildOfflineResult(cached(biscuit, NOW - 40 * DAY_MS), profiles, "p1", NOW).age.stale).toBe(true);
    });

    it("an allergy with an incomplete ingredient list is never green offline either", () => {
        const c = cached({ code: "20000002", product_name: "Mystery", states_tags: ["en:ingredients-to-be-completed"], ingredients_text: "Flour", nutriments: { sugars_100g: 1, salt_100g: 0.1, "saturated-fat_100g": 0.1 } });
        const r = buildOfflineResult(c, profiles, "p1", NOW);
        expect(r.ingredientsUnverified).toBe(true);
        expect(r.verdicts[0].verdict.status).toBe("cannot_verify");
    });

    it("a product without any ingredient list is unverified", () => {
        const c = cached({ code: "20000003", product_name: "Bare", nutriments: { sugars_100g: 1 } });
        expect(buildOfflineResult(c, profiles, "p1", NOW).ingredientsUnverified).toBe(true);
    });

    it("works without any profile: only the universal score", () => {
        const r = buildOfflineResult(cached(biscuit), [], null, NOW);
        expect(r.verdicts).toEqual([]);
        expect(r.activeId).toBeNull();
        expect(r.score.letter).toMatch(/^[A-E]$/);
    });

    it("falls back to the first profile when the active id is unknown", () => {
        expect(buildOfflineResult(cached(biscuit), profiles, "ghost", NOW).activeId).toBe("p1");
        expect(buildOfflineResult(cached(biscuit), profiles, null, NOW).activeId).toBe("p1");
    });
});
