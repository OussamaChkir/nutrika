import { beforeEach, describe, expect, it, vi } from "vitest";

// A recording fake of the Prisma client: these tests check WHICH rows each call may touch
// (ownership is part of the query), not the database itself.
type Args = { where?: Record<string, unknown>; data?: Record<string, unknown> };
type Row = Record<string, unknown>;
const calls: Array<{ model: string; op: string; args: Args }> = [];
let updateManyCount = 1;
let rows: Record<string, Row[]> = {};

function model(name: string) {
    return new Proxy({}, {
        get: (_t, op: string) => async (args: Args) => {
            calls.push({ model: name, op, args });
            if (op === "findMany") return rows[name] ?? [];
            if (op === "findUnique") return (rows[name] ?? [])[0] ?? null;
            if (op === "updateMany" || op === "deleteMany") return { count: updateManyCount };
            if (op === "create") return { id: "aaaaaaaaaaaaaaaaaaaaaaaa", createdAt: new Date("2026-01-01T00:00:00Z"), checked: false, ...args.data };
            return null;
        },
    });
}

vi.mock("../db", () => ({
    prisma: { shoppingListItem: model("shoppingListItem"), savedProduct: model("savedProduct"), product: model("product") },
}));

import {
    addFreeTextToListFor,
    clearCheckedItemsFor,
    clearProductStateFor,
    putProductStateFor,
    removeListItemFor,
    setItemCheckedFor,
    setItemQuantityFor,
} from "./service";

const ME = "bbbbbbbbbbbbbbbbbbbbbbbb";
const ITEM = "cccccccccccccccccccccccc";

beforeEach(() => {
    calls.length = 0;
    updateManyCount = 1;
    rows = {};
});

describe("ownership: every write is scoped to the user", () => {
    it("setItemChecked / setItemQuantity / removeListItem filter by userId", async () => {
        await setItemCheckedFor(ME, ITEM, true);
        await setItemQuantityFor(ME, ITEM, 3);
        await removeListItemFor(ME, ITEM);
        expect(calls).toHaveLength(3);
        for (const c of calls) expect(c.args.where).toMatchObject({ id: ITEM, userId: ME });
    });

    it("clearCheckedItems only deletes the user's own checked items", async () => {
        await clearCheckedItemsFor(ME);
        expect(calls[0].args.where).toEqual({ userId: ME, checked: true });
    });

    it("clearProductState filters by userId", async () => {
        await clearProductStateFor(ME, "3017620422003");
        expect(calls[0].args.where).toEqual({ userId: ME, barcode: "3017620422003" });
    });

    it("someone else's item answers not_found (nothing matched), not ok", async () => {
        updateManyCount = 0;
        expect(await setItemCheckedFor(ME, ITEM, true)).toEqual({ ok: false, error: "not_found" });
        expect(await setItemQuantityFor(ME, ITEM, 2)).toEqual({ ok: false, error: "not_found" });
    });
});

describe("input is validated before any query", () => {
    it("rejects a malformed id without touching the database", async () => {
        expect(await setItemCheckedFor(ME, "not-an-id", true)).toEqual({ ok: false, error: "invalid" });
        expect(await setItemQuantityFor(ME, "{$ne:null}", 1)).toEqual({ ok: false, error: "invalid" });
        expect(await removeListItemFor(ME, "x")).toEqual({ ok: false, error: "invalid" });
        expect(calls).toHaveLength(0);
    });

    it("rejects a non-boolean checked value and a bad barcode", async () => {
        expect(await setItemCheckedFor(ME, ITEM, "yes" as unknown as boolean)).toEqual({ ok: false, error: "invalid" });
        expect(await clearProductStateFor(ME, "abc")).toEqual({ ok: false, error: "invalid" });
        expect(await putProductStateFor(ME, "3017620422003", "love" as never)).toEqual({ ok: false, error: "invalid" });
        expect(calls).toHaveLength(0);
    });

    it("rejects an empty free-text label", async () => {
        expect(await addFreeTextToListFor(ME, { label: "  \n " })).toEqual({ ok: false, error: "invalid" });
        expect(calls).toHaveLength(0);
    });
});

describe("shopping list adds", () => {
    it("creates a free-text item for this user with a clamped quantity", async () => {
        const result = await addFreeTextToListFor(ME, { label: "  bread ", quantity: 500 });
        expect(result.ok).toBe(true);
        const create = calls.find((c) => c.op === "create")!;
        expect(create.args.data).toMatchObject({ userId: ME, barcode: null, label: "bread", quantity: 99 });
    });

    it("raises the quantity of an existing unchecked item instead of duplicating it", async () => {
        rows.shoppingListItem = [{ id: ITEM, barcode: null, label: "Bread", category: null, quantity: 2, checked: false, createdAt: new Date() }];
        const result = await addFreeTextToListFor(ME, { label: "bread", quantity: 1 });
        expect(result).toMatchObject({ ok: true, firstItem: false, item: { id: ITEM, quantity: 3 } });
        expect(calls.some((c) => c.op === "create")).toBe(false);
        const update = calls.find((c) => c.op === "updateMany")!;
        expect(update.args.where).toEqual({ id: ITEM, userId: ME });
    });

    it("refuses a product that is not an approved catalogue product", async () => {
        rows.product = [];
        expect(await putProductStateFor(ME, "3017620422003", "approved")).toEqual({ ok: false, error: "not_found" });
        rows.product = [{ barcode: "3017620422003", status: "PENDING" }];
        expect(await putProductStateFor(ME, "3017620422003", "approved")).toEqual({ ok: false, error: "not_found" });
    });
});
