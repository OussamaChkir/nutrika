import { describe, expect, it } from "vitest";

import { toPersonalProfile, toProfileDto, type StoredProfile } from "./profile";

const row = (overrides: Partial<StoredProfile> = {}): StoredProfile => ({
    id: "665f1c2e9b1e8a3f4c5d6e7f",
    name: "Sara",
    ageBand: "child",
    isDefault: true,
    conditions: ["diabetes"],
    diets: ["vegan"],
    goals: ["muscle_gain"],
    allergens: ["Milk", "Eggs"],
    allergenStrictness: "intentional_only",
    ...overrides,
});

describe("toPersonalProfile", () => {
    it("keeps valid values", () => {
        expect(toPersonalProfile(row())).toEqual({
            conditions: ["diabetes"],
            diets: ["vegan"],
            goals: ["muscle_gain"],
            allergens: ["Milk", "Eggs"],
            allergenStrictness: "intentional_only",
        });
    });

    it("drops values the rules do not know (old or tampered data)", () => {
        const p = toPersonalProfile(
            row({ conditions: ["diabetes", "pregnancy"], diets: ["halal"], goals: ["x"], allergens: ["Milk", "Pollen"] })
        );
        expect(p.conditions).toEqual(["diabetes"]);
        expect(p.diets).toEqual([]);
        expect(p.goals).toEqual([]);
        expect(p.allergens).toEqual(["Milk"]);
    });

    it("falls back to the safer strictness when the stored value is unknown", () => {
        expect(toPersonalProfile(row({ allergenStrictness: "relaxed" })).allergenStrictness).toBe("avoid_traces");
    });
});

describe("toProfileDto", () => {
    it("exposes only what the editor needs", () => {
        const dto = toProfileDto({ ...row(), userId: "u1", consentedAt: new Date() } as StoredProfile);
        expect(Object.keys(dto).sort()).toEqual(
            ["ageBand", "allergenStrictness", "allergens", "conditions", "diets", "goals", "id", "isDefault", "name"]
        );
    });

    it("falls back to adult for an unknown age band", () => {
        expect(toProfileDto(row({ ageBand: "baby" })).ageBand).toBe("adult");
        expect(toProfileDto(row()).ageBand).toBe("child");
    });
});
