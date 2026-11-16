"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, FlaskConical, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { AdditiveView } from "@/lib/additives/lookup";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import { MedicalDisclaimer } from "./medical-disclaimer";

export interface AdditiveChipItem {
    /** Normalized code, e.g. "E102". */
    code: string;
    /** The explanation, or null when we have none yet. */
    view: AdditiveView | null;
    /** "For you" notes that match the active profile, already filtered on the server. */
    forYou: string[];
}

interface AdditiveChipsProps {
    items: AdditiveChipItem[];
    className?: string;
}

/**
 * The additives of a product as tappable chips (F6). Tapping opens a bottom sheet:
 * what it is, why it is used, what is known, who it matters for, evidence and sources.
 * Codes without an explanation still open a sheet that says so, instead of a dead chip.
 */
export function AdditiveChips({ items, className }: AdditiveChipsProps) {
    const t = useTranslations("Additives");
    const [openCode, setOpenCode] = useState<string | null>(null);
    const current = items.find((i) => i.code === openCode) ?? null;

    if (items.length === 0) return null;

    const open = (item: AdditiveChipItem) => {
        setOpenCode(item.code);
        trackEvent("ingredient_explanation_opened", { kind: "additive", code: item.code, hasInfo: item.view !== null });
    };

    return (
        <section aria-labelledby="additives-title" className={className}>
            <h2 id="additives-title" className="mb-1 flex items-center gap-2 text-lg font-semibold">
                <FlaskConical className="h-5 w-5 text-neutral-500" aria-hidden />
                {t("title", { count: items.length })}
            </h2>
            <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">{t("hint")}</p>

            <ul className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <li key={item.code}>
                        <button
                            type="button"
                            onClick={() => open(item)}
                            className={cn(
                                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                                "border-neutral-300 bg-white hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500",
                                "dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                            )}
                        >
                            <span className="font-semibold">{item.code}</span>
                            {item.view && <span className="text-neutral-600 dark:text-neutral-300">{item.view.name}</span>}
                            {item.forYou.length > 0 && (
                                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-500/20 dark:text-orange-200">
                                    {t("forYouBadge")}
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>

            <Dialog.Root open={current !== null} onOpenChange={(o) => !o && setOpenCode(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                    <Dialog.Content
                        className={cn(
                            "fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 shadow-xl",
                            "bg-white dark:bg-neutral-900 sheet-in focus:outline-none"
                        )}
                    >
                        {current && <SheetBody item={current} />}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </section>
    );
}

function SheetBody({ item }: { item: AdditiveChipItem }) {
    const t = useTranslations("Additives");
    const { view, code, forYou } = item;

    return (
        <>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <Dialog.Title className="text-xl font-bold">
                        {code}
                        {view ? ` · ${view.name}` : ""}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-neutral-500 dark:text-neutral-400">
                        {view ? t(`categories.${view.category}`) : t("noExplanationShort")}
                    </Dialog.Description>
                </div>
                <Dialog.Close
                    aria-label={t("close")}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                    <X className="h-5 w-5" aria-hidden />
                </Dialog.Close>
            </div>

            {!view ? (
                <p className="text-sm">{t("noExplanation")}</p>
            ) : (
                <div className="space-y-4 text-sm">
                    {!view.reviewed && (
                        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                            {t("draft")}
                        </p>
                    )}
                    {forYou.length > 0 && (
                        <Block title={t("forYou")} highlight>
                            <ul className="list-disc space-y-1 ps-5">
                                {forYou.map((note) => (
                                    <li key={note}>{note}</li>
                                ))}
                            </ul>
                        </Block>
                    )}
                    <Block title={t("whatItIs")}>{view.whatItIs}</Block>
                    <Block title={t("whyUsed")}>{view.whyUsed}</Block>
                    <Block title={t("known")}>{view.knownAndUnknown}</Block>
                    <Block title={t("evidence")}>
                        <strong>{t(`evidenceLevels.${view.evidence}.label`)}</strong>
                        {" · "}
                        {t(`evidenceLevels.${view.evidence}.desc`)}
                    </Block>
                    <Block title={t("sources")}>
                        <ul className="space-y-1">
                            {view.sources.map((s) => (
                                <li key={s.url}>
                                    <a
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-start gap-1 underline underline-offset-2"
                                    >
                                        {s.label}
                                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Block>
                </div>
            )}

            <MedicalDisclaimer variant="inline" className="mt-4" />
        </>
    );
}

function Block({ title, highlight, children }: { title: string; highlight?: boolean; children: React.ReactNode }) {
    return (
        <div className={cn(highlight && "rounded-lg bg-orange-50 p-3 dark:bg-orange-500/10")}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</h3>
            <div>{children}</div>
        </div>
    );
}
