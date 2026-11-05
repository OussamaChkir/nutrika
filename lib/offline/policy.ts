// F8: the rules of the on-device cache. Pure: no I/O, so they run (and are tested) anywhere.

import type { PersonalProfile } from "../profiles/constants";
import type { Product } from "../product";

/** How many products are kept on the device. The least recently used ones go first. */
export const MAX_PRODUCTS = 500;
/** Barcodes waiting for a connection. */
export const MAX_QUEUE = 50;
/** After this many failed tries a queued barcode is dropped. */
export const MAX_ATTEMPTS = 5;
/** Data older than this is labelled "may be out of date". */
export const STALE_AFTER_DAYS = 30;

export const DAY_MS = 24 * 60 * 60 * 1000;

export type CacheSource = "scan" | "queue";

export interface CachedProduct {
    barcode: string;
    product: Product;
    /** When the data was fetched from our server (ms since epoch). Shown as "saved 3 days ago". */
    fetchedAt: number;
    /** Last time it was shown. Used only to decide what to evict. */
    lastUsedAt: number;
    source: CacheSource;
}

/** The profile fields the rules need, as kept on the device. Never leaves the browser. */
export interface ProfileSnapshot {
    id: string;
    name: string;
    isDefault: boolean;
    profile: PersonalProfile;
}

export interface PendingLookup {
    barcode: string;
    queuedAt: number;
    attempts: number;
}

/** Same shape rule as the scan page: 8 to 14 digits. Anything else never reaches the database or the network. */
export const isValidBarcode = (value: unknown): value is string => typeof value === "string" && /^\d{8,14}$/.test(value);

/** Barcodes to delete so that at most `max` remain, least recently used first. Ties: oldest fetch first. */
export function planEviction(entries: readonly Pick<CachedProduct, "barcode" | "lastUsedAt" | "fetchedAt">[], max: number = MAX_PRODUCTS): string[] {
    const excess = entries.length - max;
    if (excess <= 0) return [];
    return [...entries]
        .sort((a, b) => a.lastUsedAt - b.lastUsedAt || a.fetchedAt - b.fetchedAt || a.barcode.localeCompare(b.barcode))
        .slice(0, excess)
        .map((e) => e.barcode);
}

export type AgeUnit = "justNow" | "minutes" | "hours" | "days";

export interface Age {
    unit: AgeUnit;
    value: number;
    /** Older than STALE_AFTER_DAYS: say so. */
    stale: boolean;
}

/** "Saved 3 days ago" as data, so the wording can live in the messages files (EN and FR). */
export function describeAge(fetchedAt: number, now: number): Age {
    const diff = Math.max(0, now - fetchedAt);
    const minutes = Math.floor(diff / 60_000);
    const stale = diff > STALE_AFTER_DAYS * DAY_MS;
    if (minutes < 1) return { unit: "justNow", value: 0, stale };
    if (minutes < 60) return { unit: "minutes", value: minutes, stale };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { unit: "hours", value: hours, stale };
    return { unit: "days", value: Math.floor(hours / 24), stale };
}

/** Add a barcode to the queue: no duplicates, never above MAX_QUEUE (the oldest entry makes room). */
export function planEnqueue(queue: readonly PendingLookup[], barcode: string, now: number): { queue: PendingLookup[]; added: boolean } {
    if (!isValidBarcode(barcode)) return { queue: [...queue], added: false };
    if (queue.some((q) => q.barcode === barcode)) return { queue: [...queue], added: false };
    const next = [...queue, { barcode, queuedAt: now, attempts: 0 }].sort((a, b) => a.queuedAt - b.queuedAt);
    return { queue: next.slice(Math.max(0, next.length - MAX_QUEUE)), added: true };
}

/** A product is only kept on the device when it is safe to show to anyone: approved catalogue data with a valid barcode. */
export function isCacheable(product: Pick<Product, "barcode">, status: string | undefined): boolean {
    return isValidBarcode(product.barcode) && status === "APPROVED";
}

/** Shape check on what comes back from IndexedDB or the network before it is trusted. */
export function looksLikeProduct(value: unknown): value is Product {
    if (!value || typeof value !== "object") return false;
    const p = value as Record<string, unknown>;
    return (
        isValidBarcode(p.barcode) &&
        typeof p.name === "string" &&
        typeof p.nutrients === "object" && p.nutrients !== null &&
        Array.isArray(p.additives) &&
        Array.isArray(p.allergens) &&
        Array.isArray(p.traces) &&
        Array.isArray(p.categoryTags) &&
        Array.isArray(p.ingredientsAnalysisTags) &&
        typeof p.labels === "object" && p.labels !== null &&
        typeof p.ingredientsStatus === "string"
    );
}
