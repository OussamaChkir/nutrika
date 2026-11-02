"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { trackEvent } from "@/lib/analytics";
import type { PersonalVerdict } from "@/lib/profiles/evaluate";
import { mostSevereReason } from "@/lib/profiles/summary";
import { cn } from "@/lib/utils";

import { STATUS_STYLE, useReasonText } from "./personal-score-shared";

export interface EveryoneRow {
    id: string;
    name: string;
    isActive: boolean;
    verdict: PersonalVerdict;
}

/**
 * "Check for everyone" (F4): one product, one verdict per profile, on one screen.
 * A parent sees at a glance who can eat it. Collapsed by default; opening it is tracked.
 */
export function EveryoneMatrix({ rows }: { rows: EveryoneRow[] }) {
    const t = useTranslations("PersonalScore");
    const { reasonText } = useReasonText();

    if (rows.length < 2) return null;

    return (
        <details
            className="group mt-3 rounded-2xl border border-neutral-200 bg-white/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/40"
            onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                    trackEvent("everyone_view_opened", { profiles: rows.length });
                }
            }}
        >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                <span>
                    {t("everyone.title")}
                    <span className="ml-2 text-xs font-medium text-neutral-500">{t("everyone.count", { count: rows.length })}</span>
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>

            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-sm">
                    <thead>
                        <tr className="text-xs uppercase tracking-wide text-neutral-500">
                            <th className="pb-2 pr-3 font-semibold">{t("everyone.colName")}</th>
                            <th className="pb-2 pr-3 font-semibold">{t("everyone.colVerdict")}</th>
                            <th className="pb-2 font-semibold">{t("everyone.colWhy")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const style = STATUS_STYLE[row.verdict.status];
                            const Icon = style.Icon;
                            const reason = mostSevereReason(row.verdict);
                            return (
                                <tr key={row.id} className={cn("border-t border-neutral-200 align-top dark:border-neutral-800", row.isActive && "bg-orange-50/60 dark:bg-orange-950/10")}>
                                    <th scope="row" className="py-2 pr-3 font-semibold text-neutral-900 dark:text-neutral-100">
                                        {row.name}
                                        {row.isActive && <span className="ml-1.5 text-[11px] font-medium text-orange-600">· {t("everyone.you")}</span>}
                                    </th>
                                    <td className="py-2 pr-3">
                                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", style.box, style.text)}>
                                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                            {t(`status.${row.verdict.status}`)}
                                            {row.verdict.personalScore !== null && (
                                                <span className="tabular-nums">· {row.verdict.personalScore}</span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="py-2 text-neutral-700 dark:text-neutral-300">
                                        {reason ? reasonText(reason) : t("everyone.noReason")}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </details>
    );
}
