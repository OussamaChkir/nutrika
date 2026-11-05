import { describe, expect, it } from "vitest";

import {
    checkRegion,
    decideQuota,
    DEFAULT_GLOBAL_PER_DAY,
    parseDailyBudget,
    parseTier,
    PER_USER_PER_DAY,
    RESTRICTED_COUNTRIES,
} from "./access";

describe("parseTier", () => {
    it("defaults to free, so a missing or odd value never opens the gate", () => {
        expect(parseTier(undefined)).toBe("free");
        expect(parseTier("")).toBe("free");
        expect(parseTier("premium")).toBe("free");
        expect(parseTier(" PAID ")).toBe("paid");
    });
});

describe("checkRegion", () => {
    it("free tier: blocks EEA, Switzerland and the UK", () => {
        for (const c of ["FR", "DE", "ES", "IT", "NO", "IS", "LI", "CH", "GB", "fr"]) {
            expect(checkRegion("free", c)).toEqual({ allowed: false, reason: "region" });
        }
    });

    it("free tier: allows other countries", () => {
        for (const c of ["TN", "DZ", "MA", "US", "CA", "EG", "tn"]) {
            expect(checkRegion("free", c)).toEqual({ allowed: true });
        }
    });

    it("free tier: unknown or malformed country fails closed", () => {
        for (const c of [null, undefined, "", "XX1", "T", "12"]) {
            expect(checkRegion("free", c)).toEqual({ allowed: false, reason: "unknown_region" });
        }
    });

    it("paid tier: allowed everywhere, even unknown", () => {
        expect(checkRegion("paid", "FR")).toEqual({ allowed: true });
        expect(checkRegion("paid", null)).toEqual({ allowed: true });
    });

    it("covers all 27 EU members plus Iceland, Liechtenstein, Norway, Switzerland and the UK", () => {
        const eu = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" ");
        expect(eu).toHaveLength(27);
        for (const c of [...eu, "IS", "LI", "NO", "CH", "GB"]) expect(RESTRICTED_COUNTRIES.has(c)).toBe(true);
        expect(RESTRICTED_COUNTRIES.size).toBe(32);
    });
});

describe("quotas", () => {
    it("per-user limit is 5 per day", () => {
        expect(PER_USER_PER_DAY).toBe(5);
        expect(decideQuota({ userCount: 4, globalCount: 0, globalBudget: 200 })).toEqual({ ok: true, remaining: 0 });
        expect(decideQuota({ userCount: 5, globalCount: 0, globalBudget: 200 })).toEqual({ ok: false, reason: "user_limit" });
    });

    it("global budget stops everyone", () => {
        expect(decideQuota({ userCount: 0, globalCount: 199, globalBudget: 200 }).ok).toBe(true);
        expect(decideQuota({ userCount: 0, globalCount: 200, globalBudget: 200 })).toEqual({ ok: false, reason: "global_limit" });
    });

    it("reports remaining scans", () => {
        expect(decideQuota({ userCount: 0, globalCount: 0, globalBudget: 200 })).toEqual({ ok: true, remaining: 4 });
    });

    it("parseDailyBudget falls back on junk and caps huge values", () => {
        expect(parseDailyBudget(undefined)).toBe(DEFAULT_GLOBAL_PER_DAY);
        expect(parseDailyBudget("abc")).toBe(DEFAULT_GLOBAL_PER_DAY);
        expect(parseDailyBudget("-5")).toBe(DEFAULT_GLOBAL_PER_DAY);
        expect(parseDailyBudget("50")).toBe(50);
        expect(parseDailyBudget("999999999")).toBe(100_000);
    });
});
