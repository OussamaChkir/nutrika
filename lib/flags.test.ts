import { describe, expect, it } from "vitest";

import { FEATURE_FLAGS, isFeatureEnabled, parseFlag } from "./flags";

describe("parseFlag", () => {
    it("accepts 1, true, on, yes in any case", () => {
        for (const v of ["1", "true", "TRUE", "On", " yes "]) expect(parseFlag(v)).toBe(true);
    });

    it("is off for unset, empty and unrecognised values", () => {
        for (const v of [undefined, "", "0", "false", "off", "enabled", "2"]) expect(parseFlag(v)).toBe(false);
    });
});

describe("isFeatureEnabled", () => {
    it("reads the given source", () => {
        expect(isFeatureEnabled("personalScore", { personalScore: "1" })).toBe(true);
        expect(isFeatureEnabled("personalScore", { personalScore: "0" })).toBe(false);
        expect(isFeatureEnabled("offlineMode", { personalScore: "1" })).toBe(false);
    });

    it("is off by default when no flag is set in the environment", () => {
        for (const flag of FEATURE_FLAGS) expect(isFeatureEnabled(flag)).toBe(false);
    });

    it("has one flag per roadmap feature (F1-F10)", () => {
        expect(FEATURE_FLAGS).toHaveLength(10);
    });
});
