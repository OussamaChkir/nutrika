import { beforeEach, describe, expect, it, vi } from "vitest";

type Args = { where?: Record<string, unknown>; data?: Record<string, unknown> };
type Row = Record<string, unknown>;
const calls: Array<{ model: string; op: string; args: Args }> = [];
let found: Row | null = null;
let existingCount = 0;
let remaining: Row[] = [];

function model(name: string) {
    return new Proxy({}, {
        get: (_t, op: string) => async (args: Args) => {
            calls.push({ model: name, op, args });
            if (op === "count") return existingCount;
            if (op === "findFirst") return found;
            if (op === "findMany") return remaining;
            if (op === "deleteMany") return { count: found ? 1 : 0 };
            if (op === "create") return { id: "aaaaaaaaaaaaaaaaaaaaaaaa", ...args.data };
            return { count: 1 };
        },
    });
}

const tx = { profile: model("profile") };
vi.mock("../db", () => ({
    prisma: {
        profile: model("profile"),
        scanEvent: model("scanEvent"),
        $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
}));

import { MAX_PROFILES_PER_USER } from "./constants";
import { createProfileFor, deleteProfileFor, findOwnedProfile, updateProfileFor } from "./service";

const ME = "bbbbbbbbbbbbbbbbbbbbbbbb";
const PID = "dddddddddddddddddddddddd";
const valid = { name: "Nour", ageBand: "child", allergens: ["Milk"], consent: true };

beforeEach(() => {
    calls.length = 0;
    found = null;
    existingCount = 0;
    remaining = [];
});

describe("createProfileFor", () => {
    it("requires explicit consent before storing health data", async () => {
        expect(await createProfileFor(ME, { ...valid, consent: false })).toEqual({ ok: false, error: "invalid" });
        const noConsent: Record<string, unknown> = { ...valid };
        delete noConsent.consent;
        expect(await createProfileFor(ME, noConsent)).toEqual({ ok: false, error: "invalid" });
        expect(calls).toHaveLength(0);
    });

    it("rejects unknown values instead of storing them", async () => {
        expect(await createProfileFor(ME, { ...valid, conditions: ["flu"] })).toEqual({ ok: false, error: "invalid" });
        expect(await createProfileFor(ME, { ...valid, name: "   " })).toEqual({ ok: false, error: "invalid" });
    });

    it("stops at the profile limit", async () => {
        existingCount = MAX_PROFILES_PER_USER;
        expect(await createProfileFor(ME, valid)).toEqual({ ok: false, error: "limit" });
        expect(calls.some((c) => c.op === "create")).toBe(false);
    });

    it("makes the first profile the default and active, owned by the caller", async () => {
        existingCount = 0;
        const result = await createProfileFor(ME, valid);
        expect(result).toMatchObject({ ok: true, makeActive: true, profile: { isDefault: true, name: "Nour" } });
        const create = calls.find((c) => c.op === "create")!;
        expect(create.args.data).toMatchObject({ userId: ME, isDefault: true });
        expect(create.args.data.consentedAt).toBeInstanceOf(Date);
        expect(create.args.data).not.toHaveProperty("consent");
    });

    it("does not make a later profile the default unless asked", async () => {
        existingCount = 1;
        const result = await createProfileFor(ME, valid);
        expect(result).toMatchObject({ ok: true, makeActive: false, profile: { isDefault: false } });
        expect(calls.some((c) => c.op === "updateMany")).toBe(false);
    });
});

describe("ownership", () => {
    it("updating someone else's profile (or a missing one) is not_found", async () => {
        found = null;
        expect(await updateProfileFor(ME, PID, valid)).toEqual({ ok: false, error: "not_found" });
        expect(calls[0].args.where).toEqual({ id: PID, userId: ME });
    });

    it("deleting someone else's profile is not_found and deletes no scan records", async () => {
        found = null;
        expect(await deleteProfileFor(ME, PID)).toEqual({ ok: false, error: "not_found" });
        expect(calls.some((c) => c.model === "scanEvent")).toBe(false);
    });

    it("deleting scopes both the profile and its scan records to the user", async () => {
        found = { id: PID };
        remaining = [];
        expect(await deleteProfileFor(ME, PID)).toEqual({ ok: true });
        const profileDelete = calls.find((c) => c.model === "profile" && c.op === "deleteMany")!;
        const eventDelete = calls.find((c) => c.model === "scanEvent")!;
        expect(profileDelete.args.where).toEqual({ id: PID, userId: ME });
        expect(eventDelete.args.where).toEqual({ userId: ME, profileId: PID });
    });

    it("promotes the oldest remaining profile when the default one is deleted", async () => {
        found = { id: PID };
        remaining = [{ id: "eeeeeeeeeeeeeeeeeeeeeeee", isDefault: false }];
        await deleteProfileFor(ME, PID);
        const promote = calls.filter((c) => c.op === "updateMany").pop()!;
        expect(promote.args).toMatchObject({ where: { id: "eeeeeeeeeeeeeeeeeeeeeeee", userId: ME }, data: { isDefault: true } });
    });

    it("findOwnedProfile ignores malformed ids and scopes by user", async () => {
        expect(await findOwnedProfile(ME, "{$ne:null}")).toBeNull();
        expect(calls).toHaveLength(0);
        await findOwnedProfile(ME, PID);
        expect(calls[0].args.where).toEqual({ id: PID, userId: ME });
    });
});
