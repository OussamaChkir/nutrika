// F3: pure decisions about the shopping list, so the server actions stay thin and testable.

import { MAX_LIST_ITEMS, MAX_QUANTITY, clampQuantity } from "./rules";

export interface ListItem {
    id: string;
    barcode: string | null;
    label: string;
    category?: string | null;
    quantity: number;
    checked: boolean;
    createdAt?: Date | string | number;
}

export interface AddInput {
    barcode: string | null;
    label: string;
    category?: string | null;
    quantity: number;
}

export type AddPlan =
    | { type: "create"; data: { barcode: string | null; label: string; category: string | null; quantity: number } }
    | { type: "increment"; id: string; quantity: number }
    | { type: "error"; code: "limit" };

/**
 * Adding a product that is already on the list (and not yet checked off) raises its quantity
 * instead of creating a duplicate. A checked item counts as bought, so adding it again starts
 * a new line. Free text is matched by label, ignoring case.
 */
export function planAdd(existing: readonly ListItem[], input: AddInput): AddPlan {
    const quantity = clampQuantity(input.quantity);
    const same = existing.find(
        (item) =>
            !item.checked &&
            (input.barcode !== null
                ? item.barcode === input.barcode
                : item.barcode === null && item.label.trim().toLowerCase() === input.label.trim().toLowerCase())
    );
    if (same) return { type: "increment", id: same.id, quantity: Math.min(MAX_QUANTITY, same.quantity + quantity) };
    if (existing.length >= MAX_LIST_ITEMS) return { type: "error", code: "limit" };
    return { type: "create", data: { barcode: input.barcode, label: input.label, category: input.category ?? null, quantity } };
}

const time = (v: ListItem["createdAt"]) => (v === undefined ? 0 : new Date(v).getTime());

/** Still to buy first (oldest first), bought items last. Stable. */
export function sortItems<T extends ListItem>(items: readonly T[]): T[] {
    return [...items].sort((a, b) => Number(a.checked) - Number(b.checked) || time(a.createdAt) - time(b.createdAt) || a.id.localeCompare(b.id));
}

export function remainingCount(items: readonly ListItem[]): number {
    return items.filter((i) => !i.checked).length;
}
