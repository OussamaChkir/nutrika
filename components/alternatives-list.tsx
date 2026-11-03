"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { InlineScoreBadge } from "@/components/score-badge";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { isSoldIn, type Alternative } from "@/lib/alternatives/rank";

interface AlternativesListProps {
    alternatives: Alternative[];
    /** Letter of the scanned product, sent with the tap event. */
    fromLetter: string;
    /** Name of the active profile when the ranking is personal, else null. */
    profileName: string | null;
    /** OFF country tag the app is configured for (e.g. en:tunisia), or null. */
    countryTag: string | null;
}

/** F2: better alternatives, each with the one reason it is better. Empty state when none qualify. */
export function AlternativesList({ alternatives, fromLetter, profileName, countryTag }: AlternativesListProps) {
    const t = useTranslations("Alternatives");
    const personal = profileName !== null;

    useEffect(() => {
        trackEvent("alternatives_opened", { count: alternatives.length, personal });
    }, [alternatives.length, personal]);

    return (
        <section className="mt-7 space-y-3" aria-labelledby="alternatives-title">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" aria-hidden />
                <h3 id="alternatives-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {personal ? t("titleForYou", { name: profileName }) : t("title")}
                </h3>
            </div>

            {alternatives.length === 0 ? (
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    {t("empty")}
                </p>
            ) : (
                <>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("subtitle")}</p>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {alternatives.map((alt) => {
                            const sold = isSoldIn(alt, countryTag);
                            return (
                                <li key={alt.barcode}>
                                    <Link
                                        href={`/product/${alt.barcode}`}
                                        onClick={() => trackEvent("alternative_tapped", { fromGrade: fromLetter })}
                                        aria-label={t("openProduct", { name: alt.name })}
                                    >
                                        <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                                            <CardContent className="flex gap-3 p-4">
                                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                                    {alt.imageUrl ? (
                                                        <Image
                                                            src={alt.imageUrl}
                                                            alt=""
                                                            fill
                                                            className="object-contain p-1"
                                                            sizes="64px"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-2xl text-neutral-400">
                                                            📦
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <InlineScoreBadge
                                                            letter={alt.letter as "A" | "B" | "C" | "D" | "E"}
                                                            color={alt.color}
                                                        />
                                                        <h4 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                                                            {alt.name}
                                                        </h4>
                                                    </div>
                                                    {alt.brand && (
                                                        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                                                            {alt.brand}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                                        {t(`reasons.${alt.reason.key}`, alt.reason.params)}
                                                    </p>
                                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                                        {t(alt.deltaIsPersonal ? "gainPersonal" : "gain", { delta: alt.delta })}
                                                    </p>
                                                    {(alt.status === "caution" || alt.status === "good_match") && (
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            {t(`status.${alt.status}`)}
                                                        </p>
                                                    )}
                                                    {sold === false && (
                                                        <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                                            <TriangleAlert className="h-3 w-3" aria-hidden />
                                                            {t("notSoldHere")}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{t("disclaimer")}</p>
        </section>
    );
}
