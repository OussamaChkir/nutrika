"use server";

// F3 server actions. Every call: flag on, signed in, then the shared service in lib/shopping/service.ts
// (input validated, every query scoped to session.user.id). The mobile API uses the same service.

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/flags";
import type { ListItem } from "@/lib/shopping/list";
import type { SavedState } from "@/lib/shopping/rules";
import {
    addFreeTextToListFor,
    addProductToListFor,
    clearCheckedItemsFor,
    clearProductStateFor,
    removeListItemFor,
    setItemCheckedFor,
    setItemQuantityFor,
    setProductStateFor,
} from "@/lib/shopping/service";
import type { ActionResult } from "@/lib/shopping/types";

async function guard(): Promise<{ userId: string } | { error: "unauthorized" | "disabled" }> {
    if (!isFeatureEnabled("shoppingList")) return { error: "disabled" };
    const session = await auth();
    const userId = session?.user?.id;
    return userId ? { userId } : { error: "unauthorized" };
}

const refresh = () => {
    try {
        revalidatePath("/[locale]/shopping", "page");
    } catch {
        // not fatal: the client already shows the new state
    }
};

/** Refreshes the page after a successful change, and passes the result through. */
function done<T extends ActionResult<object>>(result: T): T {
    if (result.ok) refresh();
    return result;
}

/** Tap "Approve" or "Avoid": sets that state, or clears it if the product already has it. */
export async function setProductState(
    barcode: string,
    requested: SavedState
): Promise<ActionResult<{ state: SavedState | null }>> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await setProductStateFor(g.userId, barcode, requested));
}

/** Remove a product from the approved/avoid lists (used on the list page). */
export async function clearProductState(barcode: string): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await clearProductStateFor(g.userId, barcode));
}

/** "Add to list" on a scanned product. */
export async function addProductToList(barcode: string): Promise<ActionResult<{ firstItem: boolean }>> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    const result = await addProductToListFor(g.userId, barcode);
    if (!result.ok) return result;
    refresh();
    return { ok: true, firstItem: result.firstItem };
}

/** A free-text item typed on the list page ("bread"). */
export async function addFreeTextToList(input: {
    label: string;
    quantity?: number;
}): Promise<ActionResult<{ item: ListItem; firstItem: boolean }>> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await addFreeTextToListFor(g.userId, input));
}

export async function setItemQuantity(id: string, quantity: number): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await setItemQuantityFor(g.userId, id, quantity));
}

export async function setItemChecked(id: string, checked: boolean): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await setItemCheckedFor(g.userId, id, checked));
}

export async function removeListItem(id: string): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await removeListItemFor(g.userId, id));
}

export async function clearCheckedItems(): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    return done(await clearCheckedItemsFor(g.userId));
}
