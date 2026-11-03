// F3: small rules shared by the server actions and the UI. Pure, no I/O.
//
// PRODUCT DECISIONS (first proposal, change the constants): the limits below.

/** Most items a user can keep on their list. */
export const MAX_LIST_ITEMS = 200;
/** Longest label for a free-text item. */
export const MAX_LABEL_LENGTH = 120;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
/** Most saved (approved or avoided) products compared against when a product is scanned. */
export const MAX_COMPARE_PRODUCTS = 20;

export const SAVED_STATES = ["approved", "avoid"] as const;
export type SavedState = (typeof SAVED_STATES)[number];

export function parseSavedState(value: unknown): SavedState | null {
    return typeof value === "string" && (SAVED_STATES as readonly string[]).includes(value) ? (value as SavedState) : null;
}

/** MongoDB ObjectId as a string. Anything else would make the database client throw. */
export function isObjectId(value: unknown): value is string {
    return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}

/** Barcodes are digits only (EAN-8, UPC-A, EAN-13, GTIN-14 and similar). */
export function isBarcode(value: unknown): value is string {
    return typeof value === "string" && /^\d{6,14}$/.test(value);
}

/** Trim, collapse spaces, strip control characters. Null when nothing usable is left. */
export function cleanLabel(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const text = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    if (text.length === 0) return null;
    return text.slice(0, MAX_LABEL_LENGTH);
}

/** A whole number between MIN_QUANTITY and MAX_QUANTITY. Junk becomes 1. */
export function clampQuantity(value: unknown): number {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return MIN_QUANTITY;
    return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(n)));
}

/**
 * Tapping the button for the state a product already has clears it (a toggle);
 * tapping the other one switches.
 */
export function nextState(current: SavedState | null, requested: SavedState): SavedState | null {
    return current === requested ? null : requested;
}
