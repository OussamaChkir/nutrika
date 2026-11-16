"use client";

import { Minus, Plus, Share2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { groupByAisle } from "@/lib/shopping/aisle";
import { remainingCount, sortItems, type ListItem } from "@/lib/shopping/list";
import { MAX_LABEL_LENGTH, MAX_QUANTITY, MIN_QUANTITY, clampQuantity } from "@/lib/shopping/rules";
import { buildShareText, smsUrl, whatsappUrl } from "@/lib/shopping/share";
import type { ActionError, ShoppingListActions } from "@/lib/shopping/types";

interface ShoppingListProps {
    initialItems: ListItem[];
    /** Server actions, passed by the page so Storybook never bundles server code. */
    actions: ShoppingListActions;
}

/**
 * The list. Every change shows at once (optimistic) and is rolled back, with a message, if the
 * server refuses it: checking items off must feel instant even on a bad connection.
 */
export function ShoppingList({ initialItems, actions }: ShoppingListProps) {
    const t = useTranslations("Shopping");
    const [items, setItems] = useState<ListItem[]>(initialItems);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    const todo = sortItems(items.filter((i) => !i.checked));
    const bought = sortItems(items.filter((i) => i.checked));
    const remaining = remainingCount(items);
    const shareText = buildShareText(items, { title: t("shareTitle"), footer: t("shareFooter") });

    const showError = (code: ActionError) => setError(t(`errors.${code}`));

    /** Apply `next` now; run `call`; restore the previous items if it fails. */
    const optimistic = (next: ListItem[], call: () => Promise<{ ok: boolean; error?: ActionError }>) => {
        const before = items;
        setItems(next);
        setError(null);
        startTransition(async () => {
            const result = await call();
            if (!result.ok) {
                setItems(before);
                showError(result.error ?? "failed");
            }
        });
    };

    const setChecked = (item: ListItem, checked: boolean) =>
        optimistic(
            items.map((i) => (i.id === item.id ? { ...i, checked } : i)),
            () => actions.setChecked(item.id, checked)
        );

    const setQuantity = (item: ListItem, quantity: number) => {
        const q = clampQuantity(quantity);
        if (q === item.quantity) return;
        optimistic(
            items.map((i) => (i.id === item.id ? { ...i, quantity: q } : i)),
            () => actions.setQuantity(item.id, q)
        );
    };

    const remove = (item: ListItem) =>
        optimistic(
            items.filter((i) => i.id !== item.id),
            () => actions.remove(item.id)
        );

    const clearChecked = () =>
        optimistic(
            items.filter((i) => !i.checked),
            () => actions.clearChecked()
        );

    const add = (event: React.FormEvent) => {
        event.preventDefault();
        const label = draft.trim();
        if (!label) return;
        setError(null);
        setDraft("");
        startTransition(async () => {
            const result = await actions.add({ label });
            if (!result.ok) {
                setDraft(label);
                showError(result.error);
                return;
            }
            // Merge: the server may have raised the quantity of an existing line instead of adding one.
            setItems((current) =>
                current.some((i) => i.id === result.item.id)
                    ? current.map((i) => (i.id === result.item.id ? result.item : i))
                    : [...current, result.item]
            );
            trackEvent("list_item_added", { source: "list" });
            if (result.firstItem) trackEvent("list_created");
            inputRef.current?.focus();
        });
    };

    const row = (item: ListItem) => (
        <li key={item.id} className="flex items-center gap-3 py-2">
            <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => setChecked(item, e.target.checked)}
                aria-label={item.checked ? t("uncheck", { name: item.label }) : t("check", { name: item.label })}
                className="h-6 w-6 shrink-0 cursor-pointer accent-emerald-600"
            />
            <span className={`min-w-0 flex-1 break-words ${item.checked ? "text-neutral-400 line-through" : "text-neutral-900 dark:text-neutral-100"}`}>
                {item.label}
            </span>
            <div className="flex items-center gap-1" role="group" aria-label={t("quantity", { name: item.label, quantity: item.quantity })}>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={item.quantity <= MIN_QUANTITY} onClick={() => setQuantity(item, item.quantity - 1)} aria-label={t("decrease", { name: item.label })}>
                    <Minus aria-hidden />
                </Button>
                <span className="w-6 text-center text-sm tabular-nums" aria-hidden>{item.quantity}</span>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={item.quantity >= MAX_QUANTITY} onClick={() => setQuantity(item, item.quantity + 1)} aria-label={t("increase", { name: item.label })}>
                    <Plus aria-hidden />
                </Button>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => remove(item)} aria-label={t("remove", { name: item.label })}>
                <Trash2 aria-hidden />
            </Button>
        </li>
    );

    return (
        <div className="space-y-6">
            <form onSubmit={add} className="flex gap-2">
                <label htmlFor="shopping-add" className="sr-only">{t("addLabel")}</label>
                <Input
                    id="shopping-add"
                    ref={inputRef}
                    value={draft}
                    maxLength={MAX_LABEL_LENGTH}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("addPlaceholder")}
                    autoComplete="off"
                />
                <Button type="submit" disabled={pending || draft.trim() === ""}>
                    {t("addButton")}
                </Button>
            </form>

            <p role="status" aria-live="polite" className="min-h-5 text-sm text-red-600 dark:text-red-400">{error}</p>

            {items.length === 0 ? (
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    {t("empty")}
                </p>
            ) : (
                <>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {remaining > 0 ? t("remaining", { count: remaining }) : t("allDone")}
                    </p>

                    {groupByAisle(todo).map((group) => (
                        <section key={group.aisle} aria-label={t(`aisles.${group.aisle}`)}>
                            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t(`aisles.${group.aisle}`)}</h2>
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">{group.items.map(row)}</ul>
                        </section>
                    ))}

                    {bought.length > 0 && (
                        <section aria-label={t("boughtTitle")}>
                            <div className="mb-1 flex items-center justify-between">
                                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("boughtTitle")}</h2>
                                <Button type="button" variant="ghost" size="sm" onClick={clearChecked}>{t("clearChecked")}</Button>
                            </div>
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">{bought.map(row)}</ul>
                        </section>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                        <Share2 className="h-4 w-4 text-neutral-500" aria-hidden />
                        <span className="text-sm font-medium">{t("share")}</span>
                        {shareText ? (
                            <>
                                <Button asChild variant="outline" size="sm">
                                    <a href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("list_shared", { channel: "whatsapp" })}>
                                        {t("shareWhatsApp")}
                                    </a>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <a href={smsUrl(shareText)} onClick={() => trackEvent("list_shared", { channel: "sms" })}>
                                        {t("shareSms")}
                                    </a>
                                </Button>
                            </>
                        ) : (
                            <span className="text-sm text-neutral-500">{t("shareNothing")}</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
