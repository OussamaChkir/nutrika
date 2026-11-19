// F3: the database side of the shopping list and the approved/avoid lists, keyed by user id.
// Used by the web server actions (app/[locale]/shopping/actions.ts) and the mobile API (/api/v1).
// The callers do the sign-in and feature-flag checks; every query here is scoped to `userId`
// (ownership is part of the query, never checked afterwards). Name, category, score and nutrients
// are read from OUR database, never trusted from the client.

import { prisma } from "../db";
import { productFromStored } from "../product";
import { planAdd, type ListItem } from "./list";
import {
    cleanLabel,
    clampQuantity,
    isBarcode,
    isObjectId,
    nextState,
    parseSavedState,
    type SavedState,
} from "./rules";
import type { ActionResult } from "./types";

/** Snapshot fields of a catalogue product. Only approved products can be saved or listed. */
async function loadSnapshot(barcode: string) {
    const product = await prisma.product.findUnique({ where: { barcode } });
    if (!product || product.status !== "APPROVED") return null;
    const tags = productFromStored(product).categoryTags;
    return {
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        category: tags.length > 0 ? tags[tags.length - 1] : null,
        score: product.score,
        scoreLetter: String(product.scoreLetter),
        sugars: product.sugars,
        saturatedFat: product.saturatedFat,
        salt: product.salt,
    };
}

function toItem(row: {
    id: string;
    barcode: string | null;
    label: string;
    category: string | null;
    quantity: number;
    checked: boolean;
    createdAt: Date;
}): ListItem {
    return { ...row, createdAt: row.createdAt.toISOString() };
}

const ITEM_SELECT = { id: true, barcode: true, label: true, category: true, quantity: true, checked: true, createdAt: true } as const;

// ---------- reading ----------

export async function getShoppingList(userId: string): Promise<ListItem[]> {
    const rows = await prisma.shoppingListItem.findMany({ where: { userId }, select: ITEM_SELECT, orderBy: { createdAt: "asc" } });
    return rows.map(toItem);
}

export interface SavedProductRow {
    barcode: string;
    name: string;
    brand: string | null;
    score: number;
    scoreLetter: string;
    state: SavedState;
}

export async function getSavedProducts(userId: string): Promise<SavedProductRow[]> {
    const rows = await prisma.savedProduct.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { barcode: true, name: true, brand: true, score: true, scoreLetter: true, state: true },
    });
    const out: SavedProductRow[] = [];
    for (const row of rows) {
        const state = parseSavedState(row.state);
        if (state) out.push({ ...row, state });
    }
    return out;
}

// ---------- approve / avoid ----------

/** Tap "Approve" or "Avoid": sets that state, or clears it if the product already has it. */
export async function setProductStateFor(
    userId: string,
    barcode: string,
    requested: SavedState
): Promise<ActionResult<{ state: SavedState | null }>> {
    const wanted = parseSavedState(requested);
    if (!isBarcode(barcode) || !wanted) return { ok: false, error: "invalid" };

    try {
        const existing = await prisma.savedProduct.findUnique({
            where: { userId_barcode: { userId, barcode } },
            select: { state: true },
        });
        const next = nextState(parseSavedState(existing?.state), wanted);
        if (next === null) {
            await prisma.savedProduct.deleteMany({ where: { userId, barcode } });
            return { ok: true, state: null };
        }
        const snapshot = await loadSnapshot(barcode);
        if (!snapshot) return { ok: false, error: "not_found" };
        await prisma.savedProduct.upsert({
            where: { userId_barcode: { userId, barcode } },
            create: { userId, state: next, ...snapshot },
            update: { state: next, ...snapshot },
        });
        return { ok: true, state: next };
    } catch (error) {
        console.error("setProductState failed:", error instanceof Error ? error.message : "unknown error");
        return { ok: false, error: "failed" };
    }
}

/** Set a state without toggling (the mobile API uses PUT, which must be idempotent). */
export async function putProductStateFor(userId: string, barcode: string, state: SavedState): Promise<ActionResult<{ state: SavedState }>> {
    if (!isBarcode(barcode) || !parseSavedState(state)) return { ok: false, error: "invalid" };
    try {
        const snapshot = await loadSnapshot(barcode);
        if (!snapshot) return { ok: false, error: "not_found" };
        await prisma.savedProduct.upsert({
            where: { userId_barcode: { userId, barcode } },
            create: { userId, state, ...snapshot },
            update: { state, ...snapshot },
        });
        return { ok: true, state };
    } catch (error) {
        console.error("putProductState failed:", error instanceof Error ? error.message : "unknown error");
        return { ok: false, error: "failed" };
    }
}

/** Remove a product from the approved/avoid lists. */
export async function clearProductStateFor(userId: string, barcode: string): Promise<ActionResult> {
    if (!isBarcode(barcode)) return { ok: false, error: "invalid" };
    try {
        await prisma.savedProduct.deleteMany({ where: { userId, barcode } });
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

// ---------- shopping list ----------

async function addToListInternal(
    userId: string,
    input: { barcode: string | null; label: string; category: string | null; quantity: number }
): Promise<ActionResult<{ item: ListItem; firstItem: boolean }>> {
    const rows = await prisma.shoppingListItem.findMany({ where: { userId }, select: ITEM_SELECT });
    const existing: ListItem[] = rows.map(toItem);
    const plan = planAdd(existing, input);
    if (plan.type === "error") return { ok: false, error: plan.code };

    if (plan.type === "increment") {
        await prisma.shoppingListItem.updateMany({ where: { id: plan.id, userId }, data: { quantity: plan.quantity } });
        const item = existing.find((i) => i.id === plan.id)!;
        return { ok: true, item: { ...item, quantity: plan.quantity }, firstItem: false };
    }
    const created = await prisma.shoppingListItem.create({ data: { userId, ...plan.data } });
    return { ok: true, item: toItem(created), firstItem: existing.length === 0 };
}

/** "Add to list" on a scanned product. */
export async function addProductToListFor(
    userId: string,
    barcode: string
): Promise<ActionResult<{ item: ListItem; firstItem: boolean }>> {
    if (!isBarcode(barcode)) return { ok: false, error: "invalid" };
    try {
        const snapshot = await loadSnapshot(barcode);
        if (!snapshot) return { ok: false, error: "not_found" };
        return await addToListInternal(userId, {
            barcode,
            label: snapshot.name,
            category: snapshot.category,
            quantity: 1,
        });
    } catch (error) {
        console.error("addProductToList failed:", error instanceof Error ? error.message : "unknown error");
        return { ok: false, error: "failed" };
    }
}

/** A free-text item typed on the list page ("bread"). */
export async function addFreeTextToListFor(
    userId: string,
    input: { label: string; quantity?: number }
): Promise<ActionResult<{ item: ListItem; firstItem: boolean }>> {
    const label = cleanLabel(input?.label);
    if (!label) return { ok: false, error: "invalid" };
    try {
        return await addToListInternal(userId, {
            barcode: null,
            label,
            category: null,
            quantity: clampQuantity(input.quantity ?? 1),
        });
    } catch (error) {
        console.error("addFreeTextToList failed:", error instanceof Error ? error.message : "unknown error");
        return { ok: false, error: "failed" };
    }
}

export async function setItemQuantityFor(userId: string, id: string, quantity: number): Promise<ActionResult> {
    if (!isObjectId(id)) return { ok: false, error: "invalid" };
    try {
        const { count } = await prisma.shoppingListItem.updateMany({
            where: { id, userId },
            data: { quantity: clampQuantity(quantity) },
        });
        return count === 0 ? { ok: false, error: "not_found" } : { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function setItemCheckedFor(userId: string, id: string, checked: boolean): Promise<ActionResult> {
    if (!isObjectId(id) || typeof checked !== "boolean") return { ok: false, error: "invalid" };
    try {
        const { count } = await prisma.shoppingListItem.updateMany({ where: { id, userId }, data: { checked } });
        return count === 0 ? { ok: false, error: "not_found" } : { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function removeListItemFor(userId: string, id: string): Promise<ActionResult> {
    if (!isObjectId(id)) return { ok: false, error: "invalid" };
    try {
        await prisma.shoppingListItem.deleteMany({ where: { id, userId } });
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function clearCheckedItemsFor(userId: string): Promise<ActionResult> {
    try {
        await prisma.shoppingListItem.deleteMany({ where: { userId, checked: true } });
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}
