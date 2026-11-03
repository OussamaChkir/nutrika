"use server";

// F3 server actions. Every call: flag on, signed in, input validated, and every query scoped to
// session.user.id (ownership is part of the query, never checked afterwards). Name, category,
// score and nutrients are read from OUR database, never trusted from the client.

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
import { productFromStored } from "@/lib/product";
import { planAdd, type ListItem } from "@/lib/shopping/list";
import {
    cleanLabel,
    clampQuantity,
    isBarcode,
    isObjectId,
    nextState,
    parseSavedState,
    type SavedState,
} from "@/lib/shopping/rules";
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

// ---------- approve / avoid ----------

/** Tap "Approve" or "Avoid": sets that state, or clears it if the product already has it. */
export async function setProductState(
    barcode: string,
    requested: SavedState
): Promise<ActionResult<{ state: SavedState | null }>> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    const wanted = parseSavedState(requested);
    if (!isBarcode(barcode) || !wanted) return { ok: false, error: "invalid" };

    try {
        const existing = await prisma.savedProduct.findUnique({
            where: { userId_barcode: { userId: g.userId, barcode } },
            select: { state: true },
        });
        const next = nextState(parseSavedState(existing?.state), wanted);
        if (next === null) {
            await prisma.savedProduct.deleteMany({ where: { userId: g.userId, barcode } });
            refresh();
            return { ok: true, state: null };
        }
        const snapshot = await loadSnapshot(barcode);
        if (!snapshot) return { ok: false, error: "not_found" };
        await prisma.savedProduct.upsert({
            where: { userId_barcode: { userId: g.userId, barcode } },
            create: { userId: g.userId, state: next, ...snapshot },
            update: { state: next, ...snapshot },
        });
        refresh();
        return { ok: true, state: next };
    } catch (error) {
        console.error("setProductState failed:", error instanceof Error ? error.message : "unknown error");
        return { ok: false, error: "failed" };
    }
}

/** Remove a product from the approved/avoid lists (used on the list page). */
export async function clearProductState(barcode: string): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    if (!isBarcode(barcode)) return { ok: false, error: "invalid" };
    try {
        await prisma.savedProduct.deleteMany({ where: { userId: g.userId, barcode } });
        refresh();
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
    const rows = await prisma.shoppingListItem.findMany({
        where: { userId },
        select: { id: true, barcode: true, label: true, category: true, quantity: true, checked: true, createdAt: true },
    });
    const existing: ListItem[] = rows.map(toItem);
    const plan = planAdd(existing, input);
    if (plan.type === "error") return { ok: false, error: plan.code };

    if (plan.type === "increment") {
        await prisma.shoppingListItem.updateMany({ where: { id: plan.id, userId }, data: { quantity: plan.quantity } });
        const item = existing.find((i) => i.id === plan.id)!;
        refresh();
        return { ok: true, item: { ...item, quantity: plan.quantity }, firstItem: false };
    }
    const created = await prisma.shoppingListItem.create({ data: { userId, ...plan.data } });
    refresh();
    return { ok: true, item: toItem(created), firstItem: existing.length === 0 };
}

/** "Add to list" on a scanned product. */
export async function addProductToList(barcode: string): Promise<ActionResult<{ firstItem: boolean }>> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    if (!isBarcode(barcode)) return { ok: false, error: "invalid" };
    try {
        const snapshot = await loadSnapshot(barcode);
        if (!snapshot) return { ok: false, error: "not_found" };
        const result = await addToListInternal(g.userId, {
            barcode,
            label: snapshot.name,
            category: snapshot.category,
            quantity: 1,
        });
        return result.ok ? { ok: true, firstItem: result.firstItem } : result;
    } catch (error) {
        console.error("addProductToList failed:", error instanceof Error ? error.message : "unknown error");
        return { ok: false, error: "failed" };
    }
}

/** A free-text item typed on the list page ("bread"). */
export async function addFreeTextToList(input: {
    label: string;
    quantity?: number;
}): Promise<ActionResult<{ item: ListItem; firstItem: boolean }>> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    const label = cleanLabel(input?.label);
    if (!label) return { ok: false, error: "invalid" };
    try {
        return await addToListInternal(g.userId, {
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

export async function setItemQuantity(id: string, quantity: number): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    if (!isObjectId(id)) return { ok: false, error: "invalid" };
    try {
        const { count } = await prisma.shoppingListItem.updateMany({
            where: { id, userId: g.userId },
            data: { quantity: clampQuantity(quantity) },
        });
        if (count === 0) return { ok: false, error: "not_found" };
        refresh();
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function setItemChecked(id: string, checked: boolean): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    if (!isObjectId(id) || typeof checked !== "boolean") return { ok: false, error: "invalid" };
    try {
        const { count } = await prisma.shoppingListItem.updateMany({ where: { id, userId: g.userId }, data: { checked } });
        if (count === 0) return { ok: false, error: "not_found" };
        refresh();
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function removeListItem(id: string): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    if (!isObjectId(id)) return { ok: false, error: "invalid" };
    try {
        await prisma.shoppingListItem.deleteMany({ where: { id, userId: g.userId } });
        refresh();
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}

export async function clearCheckedItems(): Promise<ActionResult> {
    const g = await guard();
    if ("error" in g) return { ok: false, error: g.error };
    try {
        await prisma.shoppingListItem.deleteMany({ where: { userId: g.userId, checked: true } });
        refresh();
        return { ok: true };
    } catch {
        return { ok: false, error: "failed" };
    }
}
