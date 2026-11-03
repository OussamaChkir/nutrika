import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { SavedProducts } from "@/components/saved-products";
import { ShoppingList } from "@/components/shopping-list";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
import { constructMetadata } from "@/lib/seo";
import { parseSavedState } from "@/lib/shopping/rules";
import { sortItems } from "@/lib/shopping/list";
import type { SavedProductView } from "@/lib/shopping/types";

import {
    addFreeTextToList,
    clearCheckedItems,
    clearProductState,
    removeListItem,
    setItemChecked,
    setItemQuantity,
} from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Shopping" });
    return constructMetadata({
        title: `${t("title")} | Nutrika`,
        description: t("subtitle"),
        locale,
        path: "/shopping",
    });
}

export default async function ShoppingPage() {
    if (!isFeatureEnabled("shoppingList")) notFound();
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/sign-in");

    const t = await getTranslations("Shopping");
    const [rows, savedRows] = await Promise.all([
        prisma.shoppingListItem.findMany({
            where: { userId },
            select: { id: true, barcode: true, label: true, category: true, quantity: true, checked: true, createdAt: true },
        }),
        prisma.savedProduct.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            select: { barcode: true, name: true, brand: true, score: true, scoreLetter: true, state: true },
        }),
    ]);

    const items = sortItems(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
    const saved: SavedProductView[] = savedRows.flatMap((r) => {
        const state = parseSavedState(r.state);
        return state ? [{ barcode: r.barcode, name: r.name, brand: r.brand, score: r.score, scoreLetter: r.scoreLetter, state }] : [];
    });

    return (
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <ShoppingCart className="h-6 w-6" aria-hidden />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("title")}</h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("subtitle")}</p>
                </div>
            </div>

            <ShoppingList
                initialItems={items}
                actions={{
                    add: addFreeTextToList,
                    setQuantity: setItemQuantity,
                    setChecked: setItemChecked,
                    remove: removeListItem,
                    clearChecked: clearCheckedItems,
                }}
            />

            <SavedProducts products={saved} onClear={clearProductState} />
        </div>
    );
}
