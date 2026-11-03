"use client";

import { Ban, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import type { SavedProductView } from "@/lib/shopping/types";

interface SavedProductsProps {
    products: SavedProductView[];
    /** Server action that clears the mark, passed by the page. */
    onClear: (barcode: string) => Promise<{ ok: boolean }>;
}

/** The products the user approved or wants to avoid, with a way to undo each. */
export function SavedProducts({ products, onClear }: SavedProductsProps) {
    const t = useTranslations("Shopping.saved");
    const [list, setList] = useState(products);
    const [pending, startTransition] = useTransition();

    const clear = (barcode: string) => {
        const before = list;
        setList(list.filter((p) => p.barcode !== barcode));
        startTransition(async () => {
            const result = await onClear(barcode);
            if (!result.ok) setList(before);
        });
    };

    const group = (state: "approved" | "avoid") => {
        const rows = list.filter((p) => p.state === state);
        if (rows.length === 0) return null;
        const Icon = state === "approved" ? Check : Ban;
        return (
            <section aria-label={t(state)}>
                <h3 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <Icon className="h-3 w-3" aria-hidden />
                    {t(state)}
                </h3>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {rows.map((p) => (
                        <li key={p.barcode} className="flex items-center gap-3 py-2">
                            <Link href={`/product/${p.barcode}`} className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{p.name}</span>
                                <span className="block truncate text-xs text-neutral-500">
                                    {[p.brand, `${p.scoreLetter} · ${t("scoreOf", { score: p.score })}`].filter(Boolean).join(" · ")}
                                </span>
                            </Link>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" disabled={pending} onClick={() => clear(p.barcode)} aria-label={t("remove", { name: p.name })}>
                                <X aria-hidden />
                            </Button>
                        </li>
                    ))}
                </ul>
            </section>
        );
    };

    return (
        <section aria-labelledby="saved-title" className="space-y-3">
            <div>
                <h2 id="saved-title" className="text-lg font-bold">{t("title")}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("intro")}</p>
            </div>
            {list.length === 0 ? <p className="text-sm text-neutral-500">{t("none")}</p> : (<>{group("approved")}{group("avoid")}</>)}
        </section>
    );
}
