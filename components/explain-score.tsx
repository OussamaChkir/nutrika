"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Explanation } from "@/lib/ai";

interface ExplainScoreProps {
    barcode: string;
    locale: string;
    /** Explanation already cached on the server, rendered without a click. */
    initial: Explanation | null;
    signedIn: boolean;
}

type Status = "idle" | "loading" | "error";
type ErrorKind = "unauthorized" | "rate_limited" | "unavailable";

const TONE_STYLES: Record<Explanation["highlights"][number]["tone"], string> = {
    positive: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
    negative: "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
    neutral: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-200",
};

export function ExplainScore({ barcode, locale, initial, signedIn }: ExplainScoreProps) {
    const t = useTranslations("Explain");
    const [explanation, setExplanation] = useState<Explanation | null>(initial);
    const [status, setStatus] = useState<Status>("idle");
    const [errorKind, setErrorKind] = useState<ErrorKind>("unavailable");

    async function generate() {
        setStatus("loading");
        try {
            const res = await fetch("/api/ai/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ barcode, locale }),
                signal: AbortSignal.timeout(60_000),
            });
            const data = await res.json().catch(() => null);

            if (res.ok && data?.explanation) {
                setExplanation(data.explanation as Explanation);
                setStatus("idle");
                return;
            }
            setErrorKind(
                res.status === 401 ? "unauthorized" : res.status === 429 ? "rate_limited" : "unavailable"
            );
        } catch {
            setErrorKind("unavailable");
        }
        setStatus("error");
    }

    return (
        <Card className="animate-fade-in-up mt-5 overflow-hidden border-0 shadow-md shadow-violet-100/30 dark:shadow-violet-950/20">
            <div className="flex">
                <div className="w-1 shrink-0 bg-gradient-to-b from-violet-400 to-violet-600" />
                <CardContent className="flex-1 space-y-3 p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
                        <Sparkles className="h-4 w-4" />
                        {t("title")}
                    </h3>

                    <div aria-live="polite" className="space-y-3">
                        {explanation ? (
                            <>
                                <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                                    {explanation.summary}
                                </p>
                                <ul className="space-y-2">
                                    {explanation.highlights.map((h, i) => (
                                        <li key={i} className={`rounded-xl p-3 text-sm ${TONE_STYLES[h.tone]}`}>
                                            {h.topic && <span className="font-semibold">{h.topic}: </span>}
                                            {h.detail}
                                        </li>
                                    ))}
                                </ul>
                                {explanation.swapTip && (
                                    <p className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                        <span>
                                            <strong>{t("tip")}:</strong> {explanation.swapTip}
                                        </span>
                                    </p>
                                )}
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">{t("disclaimer")}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("subtitle")}</p>

                                {status === "error" && (
                                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                                        {t(`error.${errorKind}`)}
                                        {errorKind === "unauthorized" && (
                                            <>
                                                {" "}
                                                <Link href="/sign-in" className="font-semibold underline">
                                                    {t("signIn")}
                                                </Link>
                                            </>
                                        )}
                                    </p>
                                )}

                                {status === "loading" ? (
                                    <p className="flex items-center gap-2 text-sm text-neutral-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("loading")}
                                    </p>
                                ) : (
                                    <Button type="button" variant="outline" size="sm" onClick={generate}>
                                        <Sparkles />
                                        {status === "error" ? t("retry") : t("button")}
                                    </Button>
                                )}
                                {!signedIn && status === "idle" && (
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{t("signInHint")}</p>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </div>
        </Card>
    );
}
