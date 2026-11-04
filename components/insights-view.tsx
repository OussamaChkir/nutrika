"use client";

import { CircleCheck, Eye, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ScoreTrendChart } from "@/components/score-trend-chart";
import { trackEvent } from "@/lib/analytics";
import type { Insight, InsightSeverity, InsightsResult } from "@/lib/insights/generators";

const STYLE: Record<InsightSeverity, { box: string; Icon: typeof Info }> = {
    positive: { box: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100", Icon: CircleCheck },
    notice: { box: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100", Icon: Eye },
    info: { box: "border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100", Icon: Info },
};

interface InsightsViewProps {
    result: InsightsResult;
    /** Shown when the account has several profiles, so it is clear whose scans these are. */
    profileName: string | null;
}

/** The insight cards and the score chart, or an encouraging empty state before enough scans. */
export function InsightsView({ result, profileName }: InsightsViewProps) {
    const t = useTranslations("Insights");
    const tAisle = useTranslations("Shopping.aisles");

    useEffect(() => {
        trackEvent("insights_viewed", { scans: result.scanCount, insights: result.insights.length });
    }, [result.scanCount, result.insights.length]);

    const text = (insight: Insight) =>
        t(`items.${insight.key}`, { ...insight.params, ...(insight.aisle ? { aisle: tAisle(insight.aisle) } : {}) });

    return (
        <div className="space-y-6">
            {profileName && <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("forProfile", { name: profileName })}</p>}

            {!result.enough ? (
                <section aria-labelledby="progress-title" className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <h2 id="progress-title" className="font-semibold">{t("progress.title")}</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {t("progress.text", { min: result.minScans, count: result.scanCount })}
                    </p>
                    <div
                        role="progressbar"
                        aria-label={t("progress.aria", { count: result.scanCount, min: result.minScans })}
                        aria-valuemin={0}
                        aria-valuemax={result.minScans}
                        aria-valuenow={result.scanCount}
                        className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                    >
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (result.scanCount / result.minScans) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-neutral-500">{t("progress.remaining", { remaining: Math.max(0, result.minScans - result.scanCount) })}</p>
                </section>
            ) : (
                <>
                    {result.insights.length === 0 ? (
                        <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                            {t("noPattern")}
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {result.insights.map((insight) => {
                                const { box, Icon } = STYLE[insight.severity];
                                return (
                                    <li key={insight.key} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${box}`}>
                                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{t(`severity.${insight.severity}`)}</p>
                                            <p>{text(insight)}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <section aria-labelledby="chart-title" className="space-y-2">
                        <h2 id="chart-title" className="text-lg font-bold">{t("chart.title")}</h2>
                        <ScoreTrendChart points={result.chart} />
                    </section>
                </>
            )}
        </div>
    );
}
