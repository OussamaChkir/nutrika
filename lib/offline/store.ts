// F8: the on-device database (IndexedDB). Browser only.
//
// Holds three things, all on THIS device and never sent anywhere:
//   products  recent approved products (public catalogue data), least recently used evicted at 500
//   profiles  the signed-in user's profile(s) and which one is active (health data: see Privacy page)
//   pending   barcodes scanned while offline that were not on the device
// Everything is validated when read: a corrupted or old record is ignored, never trusted.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { toPersonalProfile } from "../profiles/profile";
import type { Product } from "../product";
import {
    isValidBarcode,
    looksLikeProduct,
    MAX_PRODUCTS,
    planEnqueue,
    planEviction,
    type CachedProduct,
    type CacheSource,
    type PendingLookup,
    type ProfileSnapshot,
} from "./policy";

export const DB_NAME = "nutrika-offline";
export const DB_VERSION = 1;

interface OfflineDB extends DBSchema {
    products: { key: string; value: CachedProduct; indexes: { lastUsedAt: number } };
    profiles: { key: string; value: ProfileSnapshot };
    pending: { key: string; value: PendingLookup };
    meta: { key: string; value: { key: string; value: string } };
}

export type Db = IDBPDatabase<OfflineDB>;

let opening: Promise<Db> | null = null;

export function openOfflineDb(): Promise<Db> {
    opening ??= openDB<OfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            const products = db.createObjectStore("products", { keyPath: "barcode" });
            products.createIndex("lastUsedAt", "lastUsedAt");
            db.createObjectStore("profiles", { keyPath: "id" });
            db.createObjectStore("pending", { keyPath: "barcode" });
            db.createObjectStore("meta", { keyPath: "key" });
        },
        blocked() {
            opening = null;
        },
        terminated() {
            opening = null;
        },
    }).catch((error) => {
        opening = null;
        throw error;
    });
    return opening;
}

/** For tests: drop the cached connection so a fresh database can be opened. */
export async function closeOfflineDb(): Promise<void> {
    if (opening) {
        const db = await opening.catch(() => null);
        db?.close();
        opening = null;
    }
}

// ---------- products ----------

/** Write-through: store a product we just fetched online. Evicts the least recently used above the limit. */
export async function putProduct(product: Product, now: number, source: CacheSource = "scan"): Promise<void> {
    if (!looksLikeProduct(product)) return;
    const db = await openOfflineDb();
    const tx = db.transaction("products", "readwrite");
    await tx.store.put({ barcode: product.barcode, product, fetchedAt: now, lastUsedAt: now, source });
    const all = await tx.store.getAll();
    for (const barcode of planEviction(all, MAX_PRODUCTS)) await tx.store.delete(barcode);
    await tx.done;
}

/** Read a product and mark it as used. Returns null for a missing or invalid record. */
export async function getProduct(barcode: string, now: number): Promise<CachedProduct | null> {
    if (!isValidBarcode(barcode)) return null;
    const db = await openOfflineDb();
    const row = await db.get("products", barcode);
    if (!row || !looksLikeProduct(row.product) || typeof row.fetchedAt !== "number") return null;
    const touched = { ...row, lastUsedAt: now };
    await db.put("products", touched).catch(() => undefined);
    return touched;
}

// ---------- profiles ----------

export const ACTIVE_KEY = "activeProfileId";

/**
 * Replace the stored profiles with the signed-in user's current ones. `null` (signed out, or the
 * feature is off) deletes them, so the next person to use the device never sees them.
 */
export async function setProfiles(profiles: ProfileSnapshot[] | null, activeId: string | null): Promise<void> {
    const db = await openOfflineDb();
    const tx = db.transaction(["profiles", "meta"], "readwrite");
    await tx.objectStore("profiles").clear();
    if (profiles && profiles.length > 0) {
        for (const p of profiles) await tx.objectStore("profiles").put(p);
        if (activeId && profiles.some((p) => p.id === activeId)) await tx.objectStore("meta").put({ key: ACTIVE_KEY, value: activeId });
        else await tx.objectStore("meta").delete(ACTIVE_KEY);
    } else {
        await tx.objectStore("meta").delete(ACTIVE_KEY);
    }
    await tx.done;
}

export async function getProfiles(): Promise<{ profiles: ProfileSnapshot[]; activeId: string | null }> {
    const db = await openOfflineDb();
    const rows = await db.getAll("profiles");
    const profiles = rows.flatMap((r) => {
        if (!r || typeof r.id !== "string" || typeof r.name !== "string" || !r.profile) return [];
        // Re-run the same defensive conversion as for database rows: unknown values are dropped.
        const p = r.profile as unknown as Record<string, unknown>;
        const clean = toPersonalProfile({
            id: r.id,
            name: r.name,
            ageBand: String(p.ageBand ?? "adult"),
            isDefault: Boolean(r.isDefault),
            conditions: Array.isArray(p.conditions) ? (p.conditions as string[]) : [],
            diets: Array.isArray(p.diets) ? (p.diets as string[]) : [],
            goals: Array.isArray(p.goals) ? (p.goals as string[]) : [],
            allergens: Array.isArray(p.allergens) ? (p.allergens as string[]) : [],
            allergenStrictness: String(p.allergenStrictness ?? ""),
        });
        return [{ id: r.id, name: r.name, isDefault: Boolean(r.isDefault), profile: clean }];
    });
    const stored = (await db.get("meta", ACTIVE_KEY))?.value ?? null;
    const activeId = stored && profiles.some((p) => p.id === stored) ? stored : (profiles.find((p) => p.isDefault)?.id ?? profiles[0]?.id ?? null);
    return { profiles, activeId };
}

// ---------- pending lookups ----------

export async function enqueueLookup(barcode: string, now: number): Promise<boolean> {
    const db = await openOfflineDb();
    const tx = db.transaction("pending", "readwrite");
    const current = await tx.store.getAll();
    const { queue, added } = planEnqueue(current, barcode, now);
    if (added) {
        const keep = new Set(queue.map((q) => q.barcode));
        for (const q of current) if (!keep.has(q.barcode)) await tx.store.delete(q.barcode);
        await tx.store.put(queue.find((q) => q.barcode === barcode)!);
    }
    await tx.done;
    return added;
}

export async function listQueue(): Promise<PendingLookup[]> {
    const db = await openOfflineDb();
    return (await db.getAll("pending")).filter((q) => isValidBarcode(q?.barcode)).sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function removeFromQueue(barcode: string): Promise<void> {
    const db = await openOfflineDb();
    await db.delete("pending", barcode);
}

export async function bumpAttempts(barcode: string): Promise<number> {
    const db = await openOfflineDb();
    const tx = db.transaction("pending", "readwrite");
    const row = await tx.store.get(barcode);
    const attempts = (row?.attempts ?? 0) + 1;
    if (row) await tx.store.put({ ...row, attempts });
    await tx.done;
    return attempts;
}

// ---------- management ----------

export interface StorageStats {
    products: number;
    profiles: number;
    pending: number;
    /** Rough size of what we store, in bytes (length of the JSON). Not the browser's quota. */
    approxBytes: number;
}

export async function getStats(): Promise<StorageStats> {
    const db = await openOfflineDb();
    const [products, profiles, pending] = await Promise.all([db.getAll("products"), db.getAll("profiles"), db.getAll("pending")]);
    const approxBytes = JSON.stringify(products).length + JSON.stringify(profiles).length + JSON.stringify(pending).length;
    return { products: products.length, profiles: profiles.length, pending: pending.length, approxBytes };
}

/** "Clear offline data": products, profiles, queue and settings. */
export async function clearAll(): Promise<void> {
    const db = await openOfflineDb();
    const tx = db.transaction(["products", "profiles", "pending", "meta"], "readwrite");
    await Promise.all([tx.objectStore("products").clear(), tx.objectStore("profiles").clear(), tx.objectStore("pending").clear(), tx.objectStore("meta").clear()]);
    await tx.done;
}
