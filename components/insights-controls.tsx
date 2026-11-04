"use client";

import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import type { InsightsActions } from "@/lib/insights/types";

interface InsightsControlsProps {
    enabled: boolean;
    /** How many scan records are stored for this user. */
    recordsCount: number;
    /** Server actions, passed by the page so Storybook never bundles server code. */
    actions: InsightsActions;
}

/** The opt-in card, and the controls to turn insights off, download or delete the records. */
export function InsightsControls({ enabled: initialEnabled, recordsCount: initialCount, actions }: InsightsControlsProps) {
    const t = useTranslations("Insights");
    const [enabled, setEnabled] = useState(initialEnabled);
    const [count, setCount] = useState(initialCount);
    const [confirming, setConfirming] = useState(false);
    const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
    const [pending, startTransition] = useTransition();

    const toggle = (next: boolean) => {
        setMessage(null);
        startTransition(async () => {
            const result = await actions.setEnabled(next);
            if (!result.ok) return setMessage({ text: t("data.error"), isError: true });
            setEnabled(next);
            trackEvent("insights_toggled", { enabled: next });
            setMessage(next ? null : { text: t("data.turnedOff"), isError: false });
        });
    };

    const deleteAll = () => {
        setMessage(null);
        startTransition(async () => {
            const result = await actions.deleteAll();
            setConfirming(false);
            if (!result.ok) return setMessage({ text: t("data.error"), isError: true });
            setCount(0);
            setMessage({ text: t("data.deleted"), isError: false });
        });
    };

    const status = (
        <p role="status" aria-live="polite" className={`min-h-5 text-sm ${message?.isError ? "text-red-600 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}`}>
            {message?.text}
        </p>
    );

    return (
        <div className="space-y-4">
            {!enabled && (
                <section aria-labelledby="optin-title" className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <h2 id="optin-title" className="font-semibold">{t("optIn.title")}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("optIn.text")}</p>
                    <p className="text-xs text-neutral-500">{t("optIn.note")}</p>
                    <Button type="button" disabled={pending} onClick={() => toggle(true)}>{t("optIn.enable")}</Button>
                </section>
            )}

            {(enabled || count > 0) && (
                <section aria-labelledby="data-title" className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div>
                        <h2 id="data-title" className="font-semibold">{t("data.title")}</h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("data.text")}</p>
                        <p className="mt-1 text-xs text-neutral-500">{t("data.count", { count })}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a href="/api/account/export" download>
                                <Download aria-hidden />
                                {t("data.export")}
                            </a>
                        </Button>
                        {enabled && (
                            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => toggle(false)}>
                                {t("data.turnOff")}
                            </Button>
                        )}
                        {count > 0 && !confirming && (
                            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(true)}>
                                <Trash2 aria-hidden />
                                {t("data.deleteAll")}
                            </Button>
                        )}
                    </div>
                    {confirming && (
                        <div role="alertdialog" aria-label={t("data.confirmDelete")} className="space-y-2 rounded-lg border border-red-300 p-3 dark:border-red-900">
                            <p className="text-sm">{t("data.confirmDelete")}</p>
                            <div className="flex gap-2">
                                <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={deleteAll}>{t("data.confirm")}</Button>
                                <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(false)}>{t("data.cancel")}</Button>
                            </div>
                        </div>
                    )}
                </section>
            )}
            {status}
        </div>
    );
}
