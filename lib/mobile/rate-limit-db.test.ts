import { describe, expect, it } from "vitest";

import { checkRules, takeFromStore, type RateLimitStore, type RateRule } from "./rate-limit-db";

function memoryStore() {
    const rows: Array<{ key: string; at: Date }> = [];
    let prunes = 0;
    const store: RateLimitStore = {
        async countSince(key, since) {
            return rows.filter((r) => r.key === key && r.at >= since).length;
        },
        async add(key, at) {
            rows.push({ key, at });
        },
        async pruneBefore(before) {
            prunes += 1;
            for (let i = rows.length - 1; i >= 0; i--) if (rows[i].at < before) rows.splice(i, 1);
        },
    };
    return { store, rows, prunes: () => prunes };
}

const rule: RateRule = { name: "login", limit: 2, windowMs: 60_000 };
const t0 = new Date("2026-11-18T10:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

describe("takeFromStore", () => {
    it("allows up to the limit then refuses", async () => {
        const { store } = memoryStore();
        expect((await takeFromStore(store, rule, "a", { now: t0, random: () => 1 })).allowed).toBe(true);
        expect((await takeFromStore(store, rule, "a", { now: at(1000), random: () => 1 })).allowed).toBe(true);
        const third = await takeFromStore(store, rule, "a", { now: at(2000), random: () => 1 });
        expect(third).toEqual({ allowed: false, retryAfterSeconds: 60 });
    });

    it("does not count refused attempts, and frees up once the window has passed", async () => {
        const { store, rows } = memoryStore();
        await takeFromStore(store, rule, "a", { now: t0, random: () => 1 });
        await takeFromStore(store, rule, "a", { now: at(1000), random: () => 1 });
        await takeFromStore(store, rule, "a", { now: at(2000), random: () => 1 });
        expect(rows).toHaveLength(2);
        expect((await takeFromStore(store, rule, "a", { now: at(60_001), random: () => 1 })).allowed).toBe(true);
    });

    it("keeps callers and rules separate", async () => {
        const { store } = memoryStore();
        await takeFromStore(store, rule, "a", { now: t0, random: () => 1 });
        await takeFromStore(store, rule, "a", { now: t0, random: () => 1 });
        expect((await takeFromStore(store, rule, "b", { now: t0, random: () => 1 })).allowed).toBe(true);
        expect((await takeFromStore(store, { ...rule, name: "other" }, "a", { now: t0, random: () => 1 })).allowed).toBe(true);
    });

    it("prunes old rows now and then", async () => {
        const { store, rows, prunes } = memoryStore();
        rows.push({ key: "old", at: new Date(t0.getTime() - 2 * 86_400_000) });
        await takeFromStore(store, rule, "a", { now: t0, random: () => 0 });
        expect(prunes()).toBe(1);
        expect(rows.some((r) => r.key === "old")).toBe(false);
    });
});

describe("checkRules", () => {
    it("refuses when any rule is exhausted and reports its retry time", async () => {
        const { store } = memoryStore();
        const ip: RateRule = { name: "ip", limit: 5, windowMs: 1000 };
        const email: RateRule = { name: "email", limit: 1, windowMs: 120_000 };
        const checks = [{ rule: ip, callerKey: "1.1.1.1" }, { rule: email, callerKey: "x@y.z" }];
        expect(await checkRules(store, checks, { now: t0, random: () => 1 })).toEqual({ allowed: true });
        expect(await checkRules(store, checks, { now: t0, random: () => 1 })).toEqual({ allowed: false, retryAfterSeconds: 120 });
    });

    it("fails open when the store is down", async () => {
        const broken: RateLimitStore = {
            countSince: async () => { throw new Error("db down"); },
            add: async () => {},
            pruneBefore: async () => {},
        };
        const original = console.error;
        console.error = () => {};
        try {
            expect(await checkRules(broken, [{ rule, callerKey: "a" }])).toEqual({ allowed: true });
        } finally {
            console.error = original;
        }
    });
});
