"use client";

// F8: the result of a scan when there is no connection. Reads the product and the profile from
// this device and builds the verdict with the same engines the server uses.
//
// Safety: nothing here can make an allergy look safe. When the ingredient list is missing or
// incomplete the engine answers "cannot verify", and this screen says why.

import { Loader2, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useOnline } from "@/components/offline-manager";
import { PersonalScoreCard } from "@/components/personal-score-card";
import { ScoreBadge } from "@/components/score-badge";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { buildOfflineResult, type OfflineResult } from "@/lib/offline/result";
import { enqueueLookup, getProduct, getProfiles } from "@/lib/offline/store";
import { resolveScoreAspectMessage } from "@/lib/score-messages";

type State =
    | { kind: "loading" }
    | { kind: "found"; result: OfflineResult }
    | { kind: "unknown"; queued: boolean }
    | { kind: "error" };

interface Props {
    barcode: string;
    /** Called by "Scan another product". Omit to hide the button. */
    onDone?: () => void;
}

export function OfflineLookup({ barcode, onDone }: Props) {
    const t = useTranslations("Offline.lookup");
    const tScore = useTranslations("ScoreMessages");
    const tProduct = useTranslations("Product");
    const online = useOnline();
    const [state, setState] = useState<State>({ kind: "loading" });
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const now = Date.now();
                const cached = await getProduct(barcode, now);
                if (cached) {
                    const { profiles, activeId } = await getProfiles();
                    const result = buildOfflineResult(cached, profiles, activeId, now);
                    if (cancelled) return;
                    setSelected(result.activeId);
                    setState({ kind: "found", result });
                    trackEvent("scan_completed", { withProfile: profiles.length > 0, offline: true });
                    return;
                }
                const queued = await enqueueLookup(barcode, now).catch(() => false);
                if (!cancelled) setState({ kind: "unknown", queued });
            } catch {
                if (!cancelled) setState({ kind: "error" });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [barcode]);

    const footer = (
        <div className="flex flex-col gap-3 sm:flex-row">
            {online && (
                <Button asChild className="flex-1">
                    <a href={`/product/${barcode}`}>{t("openOnline")}</a>
                </Button>
            )}
            {onDone && (
                <Button variant="outline" className="flex-1" onClick={onDone}>
                    {t("scanAnother")}
                </Button>
            )}
        </div>
    );

    if (state.kind === "loading") {
        return (
            <div role="status" className="flex items-center justify-center gap-2 p-8 text-neutral-600 dark:text-neutral-300">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {t("loading")}
            </div>
        );
    }

    if (state.kind === "unknown" || state.kind === "error") {
        return (
            <div className="mx-auto max-w-lg space-y-4 p-4">
                <div role="status" className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                    <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-50">{state.kind === "error" ? t("error") : t("notSaved.title")}</p>
                        {state.kind === "unknown" && <p>{t(state.queued ? "notSaved.queued" : "notSaved.notQueued")}</p>}
                        <p className="font-mono text-xs text-neutral-500">{barcode}</p>
                        {online && <p>{t("online")}</p>}
                    </div>
                </div>
                {footer}
            </div>
        );
    }

    const { result } = state;
    const current = result.verdicts.find((v) => v.id === selected) ?? result.verdicts[0];
    const n = result.nutrients;
    const value = (v: number | undefined, unit: string) => (v === undefined ? t("unknownValue") : `${Math.round(v * 10) / 10} ${unit}`);

    return (
        <div className="mx-auto max-w-2xl space-y-5 p-4">
            <p role="status" className="flex items-start gap-2 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100">
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                    <span className="font-semibold">{t("title")}. </span>
                    {t(`savedAgo.${result.age.unit}`, { count: result.age.value })}
                    {result.age.stale && <span className="block font-semibold">{t("stale")}</span>}
                </span>
            </p>

            <div className="flex items-center gap-4">
                <ScoreBadge score={result.score.score} letter={result.score.letter} color={result.score.color} size="lg" />
                <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-50">{result.name}</p>
                    {result.brand && <p className="text-sm text-neutral-500 dark:text-neutral-400">{result.brand}</p>}
                </div>
            </div>

            {result.ingredientsUnverified && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">{t("unverified")}</p>
            )}

            {current && (
                <div className="space-y-2">
                    {result.verdicts.length > 1 && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="off-profile" className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("profile")}</label>
                            <select id="off-profile" value={current.id} onChange={(e) => setSelected(e.target.value)} className="h-10 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                                {result.verdicts.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    )}
                    <PersonalScoreCard verdict={current.verdict} profileName={current.name} />
                </div>
            )}

            <section aria-labelledby="off-nutrients">
                <h2 id="off-nutrients" className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("per100")}</h2>
                <dl className="grid grid-cols-3 gap-3 text-center text-sm">
                    {([["sugars", n.sugars, "g"], ["saturatedFat", n.saturatedFat, "g"], ["salt", n.salt, "g"]] as const).map(([key, v, unit]) => (
                        <div key={key} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                            <dt className="text-xs text-neutral-500 dark:text-neutral-400">{t(`nutrients.${key}`)}</dt>
                            <dd className="mt-1 font-semibold text-neutral-900 dark:text-neutral-50">{value(v, unit)}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {result.score.positives.length > 0 && (
                <section aria-labelledby="off-pos"><h2 id="off-pos" className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{tProduct("positivesTitle")}</h2>
                    <ul className="space-y-2">{result.score.positives.map((p, i) => <li key={i} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{resolveScoreAspectMessage(p, tScore)}</li>)}</ul></section>
            )}
            {result.score.negatives.length > 0 && (
                <section aria-labelledby="off-neg"><h2 id="off-neg" className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">{tProduct("negativesTitle")}</h2>
                    <ul className="space-y-2">{result.score.negatives.map((p, i) => <li key={i} className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{resolveScoreAspectMessage(p, tScore)}</li>)}</ul></section>
            )}

            {/* The personal score card carries its own disclaimer. */}
            {!current && <MedicalDisclaimer variant="inline" />}
            {footer}
        </div>
    );
}
