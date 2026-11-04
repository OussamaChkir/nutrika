"use client";

import { useLocale, useTranslations } from "next-intl";

import type { ChartPoint } from "@/lib/insights/generators";

const W = 320;
const H = 140;
const PAD = { left: 28, right: 10, top: 10, bottom: 22 };

/**
 * Average score by week, as a small line chart in plain SVG. The scale is always 0 to 100, so
 * a small change never looks dramatic. Every point also exists as text for screen readers.
 */
export function ScoreTrendChart({ points }: { points: ChartPoint[] }) {
    const t = useTranslations("Insights.chart");
    const locale = useLocale();

    if (points.length < 2) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("needMore")}</p>;
    }

    const date = (week: string) =>
        new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${week}T00:00:00Z`));

    const x = (i: number) => PAD.left + (i * (W - PAD.left - PAD.right)) / (points.length - 1);
    const y = (v: number) => PAD.top + ((100 - Math.min(100, Math.max(0, v))) * (H - PAD.top - PAD.bottom)) / 100;
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.average).toFixed(1)}`).join(" ");

    return (
        <figure>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="trend-title trend-desc" className="h-auto w-full text-emerald-600 dark:text-emerald-400">
                <title id="trend-title">{t("title")}</title>
                <desc id="trend-desc">{t("desc")}</desc>
                {[0, 50, 100].map((v) => (
                    <g key={v}>
                        <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-neutral-200 dark:stroke-neutral-700" strokeWidth={1} />
                        <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" fontSize={9} className="fill-neutral-500">
                            {v}
                        </text>
                    </g>
                ))}
                <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {points.map((p, i) => (
                    <circle key={p.week} cx={x(i)} cy={y(p.average)} r={3.5} fill="currentColor">
                        <title>{t("point", { date: date(p.week), average: p.average, scans: p.scans })}</title>
                    </circle>
                ))}
                <text x={x(0)} y={H - 6} textAnchor="start" fontSize={9} className="fill-neutral-500">
                    {date(points[0].week)}
                </text>
                <text x={x(points.length - 1)} y={H - 6} textAnchor="end" fontSize={9} className="fill-neutral-500">
                    {date(points[points.length - 1].week)}
                </text>
            </svg>
            <ul className="sr-only">
                {points.map((p) => (
                    <li key={p.week}>{t("point", { date: date(p.week), average: p.average, scans: p.scans })}</li>
                ))}
            </ul>
        </figure>
    );
}
