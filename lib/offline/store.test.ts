import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { normalizeOffProduct } from "../product";
import type { PersonalProfile } from "../profiles/constants";
import { MAX_PRODUCTS, MAX_QUEUE } from "./policy";
import {
    bumpAttempts,
    clearAll,
    closeOfflineDb,
    DB_NAME,
    enqueueLookup,
    getProduct,
    getProfiles,
    getStats,
    listQueue,
    openOfflineDb,
    putProduct,
    removeFromQueue,
    setProfiles,
} from "./store";

const code = (n: number) => String(20000000 + n);
const make = (barcode: string, name = "Spread") => normalizeOffProduct({ code: barcode, product_name: name, ingredients_text: "Sugar, peanuts", nutriments: { sugars_100g: 40 } });

const peanut: PersonalProfile = { conditions: ["diabetes"], diets: [], goals: [], allergens: ["Peanuts"], allergenStrictness: "avoid_traces", ageBand: "adult" };

beforeEach(async () => {
    await closeOfflineDb();
    await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
});

describe("products (write-through cache)", () => {
    it("stores a product with its fetch date and reads it back", async () => {
        await putProduct(make(code(1), "Hazelnut spread"), 1_000);
        const got = await getProduct(code(1), 2_000);
        expect(got?.product.name).toBe("Hazelnut spread");
        expect(got?.fetchedAt).toBe(1_000);
        expect(got?.source).toBe("scan");
    });

    it("returns null for an unknown barcode and for an invalid one", async () => {
        expect(await getProduct(code(9), 1)).toBeNull();
        expect(await getProduct("../x", 1)).toBeNull();
    });

    it("fetching again refreshes the data and the fetch date", async () => {
        await putProduct(make(code(1), "Old name"), 1_000);
        await putProduct(make(code(1), "New name"), 5_000);
        const got = await getProduct(code(1), 6_000);
        expect(got).toMatchObject({ fetchedAt: 5_000 });
        expect(got?.product.name).toBe("New name");
    });

    it("reading marks the product as recently used, without changing when it was fetched", async () => {
        await putProduct(make(code(1)), 1_000);
        await getProduct(code(1), 9_000);
        const db = await openOfflineDb();
        expect(await db.get("products", code(1))).toMatchObject({ fetchedAt: 1_000, lastUsedAt: 9_000 });
    });

    it("ignores a damaged record instead of trusting it", async () => {
        const db = await openOfflineDb();
        await db.put("products", { barcode: code(1), product: { barcode: code(1), name: 5 }, fetchedAt: 1, lastUsedAt: 1, source: "scan" } as never);
        expect(await getProduct(code(1), 2)).toBeNull();
    });

    it("refuses to store something that is not a product", async () => {
        await putProduct({ barcode: "x" } as never, 1);
        expect((await getStats()).products).toBe(0);
    });

    it(`keeps at most ${MAX_PRODUCTS} products and evicts the least recently used`, async () => {
        for (let i = 0; i < MAX_PRODUCTS; i++) await putProduct(make(code(i)), 1_000 + i);
        // Use the very first product, so it is no longer the least recently used.
        await getProduct(code(0), 100_000);
        await putProduct(make(code(MAX_PRODUCTS)), 200_000);
        expect((await getStats()).products).toBe(MAX_PRODUCTS);
        expect(await getProduct(code(0), 300_000)).not.toBeNull();
        expect(await getProduct(code(1), 300_000)).toBeNull(); // the real least recently used one
        expect(await getProduct(code(MAX_PRODUCTS), 300_000)).not.toBeNull();
    }, 30_000);
});

describe("profiles (health data, on this device only)", () => {
    const snapshot = (id: string, isDefault = false) => ({ id, name: `Profile ${id}`, isDefault, profile: peanut });

    it("stores profiles and the active one", async () => {
        await setProfiles([snapshot("a", true), snapshot("b")], "b");
        const got = await getProfiles();
        expect(got.profiles.map((p) => p.id).sort()).toEqual(["a", "b"]);
        expect(got.activeId).toBe("b");
        expect(got.profiles[0].profile.allergens).toEqual(["Peanuts"]);
    });

    it("falls back to the default profile when no valid active id is stored", async () => {
        await setProfiles([snapshot("a"), snapshot("b", true)], "zzz");
        expect((await getProfiles()).activeId).toBe("b");
    });

    it("null (signed out) wipes the profiles and the active choice", async () => {
        await setProfiles([snapshot("a", true)], "a");
        await setProfiles(null, null);
        expect(await getProfiles()).toEqual({ profiles: [], activeId: null });
    });

    it("an empty list also wipes (the user deleted all profiles)", async () => {
        await setProfiles([snapshot("a", true)], "a");
        await setProfiles([], null);
        expect((await getProfiles()).profiles).toEqual([]);
    });

    it("drops unknown values from a stored profile, like for database rows", async () => {
        const db = await openOfflineDb();
        await db.put("profiles", { id: "a", name: "A", isDefault: true, profile: { conditions: ["diabetes", "hacked"], diets: ["vegan"], goals: [], allergens: ["Peanuts", "Unobtainium"], allergenStrictness: "weird" } } as never);
        const [p] = (await getProfiles()).profiles;
        expect(p.profile.conditions).toEqual(["diabetes"]);
        expect(p.profile.allergens).toEqual(["Peanuts"]);
        expect(p.profile.allergenStrictness).toBe("avoid_traces"); // the safer default
    });
});

describe("pending lookups", () => {
    it("queues once and lists oldest first", async () => {
        expect(await enqueueLookup(code(2), 200)).toBe(true);
        expect(await enqueueLookup(code(1), 100)).toBe(true);
        expect(await enqueueLookup(code(1), 300)).toBe(false);
        expect((await listQueue()).map((q) => q.barcode)).toEqual([code(1), code(2)]);
    });

    it("refuses an invalid barcode", async () => {
        expect(await enqueueLookup("abc", 1)).toBe(false);
        expect(await listQueue()).toEqual([]);
    });

    it(`never holds more than ${MAX_QUEUE}`, async () => {
        for (let i = 0; i < MAX_QUEUE + 3; i++) await enqueueLookup(code(i), i);
        const queue = await listQueue();
        expect(queue).toHaveLength(MAX_QUEUE);
        expect(queue[0].barcode).toBe(code(3));
    });

    it("counts attempts and removes entries", async () => {
        await enqueueLookup(code(1), 1);
        expect(await bumpAttempts(code(1))).toBe(1);
        expect(await bumpAttempts(code(1))).toBe(2);
        await removeFromQueue(code(1));
        expect(await listQueue()).toEqual([]);
    });
});

describe("storage management", () => {
    it("reports counts and a size, and clearAll empties everything", async () => {
        await putProduct(make(code(1)), 1);
        await putProduct(make(code(2)), 2);
        await setProfiles([{ id: "a", name: "A", isDefault: true, profile: peanut }], "a");
        await enqueueLookup(code(3), 3);
        const stats = await getStats();
        expect(stats).toMatchObject({ products: 2, profiles: 1, pending: 1 });
        expect(stats.approxBytes).toBeGreaterThan(100);

        await clearAll();
        expect(await getStats()).toMatchObject({ products: 0, profiles: 0, pending: 0 });
        expect(await getProfiles()).toEqual({ profiles: [], activeId: null });
    });
});
