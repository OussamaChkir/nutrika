import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeOffProduct } from "../product";
import { MAX_ATTEMPTS } from "./policy";
import { closeOfflineDb, DB_NAME, enqueueLookup, getProduct, listQueue } from "./store";
import { flushQueue } from "./sync";

const A = "20000001";
const B = "20000002";
const C = "20000003";

const product = (barcode: string, name = "Found") => normalizeOffProduct({ code: barcode, product_name: name, ingredients_text: "Sugar" });
const ok = (barcode: string, name?: string) => ({ ok: true, status: 200, json: async () => ({ product: product(barcode, name) }) }) as Response;
const status = (s: number) => ({ ok: s >= 200 && s < 300, status: s, json: async () => ({}) }) as Response;
const asFetch = (fn: unknown) => fn as typeof fetch;

beforeEach(async () => {
    await closeOfflineDb();
    await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
    });
});

describe("flushQueue", () => {
    it("saves resolved products on the device and empties the queue", async () => {
        await enqueueLookup(A, 1);
        const fetchImpl = vi.fn().mockResolvedValue(ok(A, "Hummus"));
        const out = await flushQueue({ now: 5_000, fetchImpl: asFetch(fetchImpl) });
        expect(out.resolved).toEqual([{ barcode: A, name: "Hummus" }]);
        expect(await listQueue()).toEqual([]);
        expect((await getProduct(A, 6_000))?.source).toBe("queue");
        expect(String(fetchImpl.mock.calls[0][0])).toBe(`/api/offline/product/${A}`);
    });

    it("drops a barcode nobody knows (404)", async () => {
        await enqueueLookup(A, 1);
        const out = await flushQueue({ fetchImpl: asFetch(vi.fn().mockResolvedValue(status(404))) });
        expect(out.notFound).toEqual([A]);
        expect(await listQueue()).toEqual([]);
    });

    it("keeps a barcode queued on a server error, and counts the attempt", async () => {
        await enqueueLookup(A, 1);
        const out = await flushQueue({ fetchImpl: asFetch(vi.fn().mockResolvedValue(status(503))) });
        expect(out.stillPending).toEqual([A]);
        expect((await listQueue())[0].attempts).toBe(1);
    });

    it("stops at the first network failure instead of hammering the rest", async () => {
        await enqueueLookup(A, 1);
        await enqueueLookup(B, 2);
        const fetchImpl = vi.fn().mockRejectedValue(new TypeError("offline"));
        const out = await flushQueue({ fetchImpl: asFetch(fetchImpl) });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(out.stillPending).toEqual([A]);
        expect((await listQueue()).map((q) => q.barcode)).toEqual([A, B]);
    });

    it(`gives up after ${MAX_ATTEMPTS} failed attempts`, async () => {
        await enqueueLookup(A, 1);
        for (let i = 0; i < MAX_ATTEMPTS; i++) await flushQueue({ fetchImpl: asFetch(vi.fn().mockResolvedValue(status(500))) });
        expect(await listQueue()).toEqual([]);
    });

    it("does not trust an answer for a different barcode or a damaged answer", async () => {
        await enqueueLookup(A, 1);
        await enqueueLookup(B, 2);
        const fetchImpl = vi.fn().mockResolvedValueOnce(ok(C)).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ product: { name: "x" } }) } as Response);
        const out = await flushQueue({ fetchImpl: asFetch(fetchImpl) });
        expect(out.resolved).toEqual([]);
        expect(out.stillPending).toEqual([A, B]);
        expect(await getProduct(C, 1)).toBeNull();
    });

    it("an empty queue does nothing", async () => {
        const fetchImpl = vi.fn();
        expect(await flushQueue({ fetchImpl: asFetch(fetchImpl) })).toEqual({ resolved: [], notFound: [], stillPending: [] });
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
