"use client";

// F5: photograph a product label, check what was read, then see the score.
//
// Flow: consent -> photo -> reading -> REVIEW (the user fixes the values) -> result.
// Safety rules in this screen: nothing is judged before the user has looked at the values; an
// allergy with an incomplete or missing ingredient list is never shown as safe (the engine
// answers "cannot verify"); the photo lives in this browser tab only and is never saved.

import { Camera, ImagePlus, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useEffect, useMemo, useRef, useState } from "react";

import { ScoreBadge } from "@/components/score-badge";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PersonalScoreCard } from "@/components/personal-score-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import type { GeminiTier } from "@/lib/label/access";
import { prepareLabelPhoto } from "@/lib/label/client-image";
import { isLabelErrorCode } from "@/lib/label/errors";
import {
    KINDS,
    labelFormSchema,
    NUTRIENT_FIELDS,
    parseNumber,
    type Extraction,
    type LabelForm,
    type LabelWarning,
    type NutrientField,
} from "@/lib/label/schema";
import { labelToProduct } from "@/lib/label/to-product";
import { resolveScoreAspectMessage } from "@/lib/score-messages";
import { scoreProduct, type ScoreResult } from "@/lib/scoring";
import { evaluateProduct, type PersonalVerdict } from "@/lib/profiles/evaluate";
import type { PersonalProfile } from "@/lib/profiles/constants";

export type LabelAvailability = "ready" | "region" | "unknown_region" | "not_configured";

export interface LabelScannerProfile {
    id: string;
    name: string;
    profile: PersonalProfile;
}

interface Props {
    availability: LabelAvailability;
    tier: GeminiTier;
    remaining: number;
    profiles: LabelScannerProfile[];
    activeId: string | null;
    /** For Storybook and tests: start on the review step with this reading, as if a photo had been read. */
    initialExtraction?: Extraction;
}

type Step = "capture" | "reading" | "review" | "result";

interface Draft {
    productName: string;
    brand: string;
    kind: LabelForm["kind"];
    ingredientsText: string;
    ingredientsComplete: boolean;
    allergensContains: string;
    allergensMayContain: string;
    nutrition: Record<NutrientField, string>;
}

const splitList = (value: string) =>
    value
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

const toDraft = (form: LabelForm): Draft => ({
    productName: form.productName,
    brand: form.brand,
    kind: form.kind,
    ingredientsText: form.ingredientsText,
    ingredientsComplete: form.ingredientsComplete,
    allergensContains: form.allergensContains.join(", "),
    allergensMayContain: form.allergensMayContain.join(", "),
    nutrition: Object.fromEntries(NUTRIENT_FIELDS.map((f) => [f, form.nutrition[f] === null ? "" : String(form.nutrition[f])])) as Record<NutrientField, string>,
});

const fromDraft = (d: Draft) => ({
    productName: d.productName,
    brand: d.brand,
    kind: d.kind,
    ingredientsText: d.ingredientsText,
    ingredientsComplete: d.ingredientsComplete && d.ingredientsText.trim().length > 0,
    allergensContains: splitList(d.allergensContains),
    allergensMayContain: splitList(d.allergensMayContain),
    nutrition: Object.fromEntries(NUTRIENT_FIELDS.map((f) => [f, d.nutrition[f].trim() === "" ? null : parseNumber(d.nutrition[f])])),
});

/** How many fields the user changed compared with what was read (a count only, for analytics). */
function countEdits(before: Draft, after: Draft): number {
    let n = 0;
    for (const key of ["productName", "brand", "kind", "ingredientsText", "ingredientsComplete", "allergensContains", "allergensMayContain"] as const) {
        if (before[key] !== after[key]) n++;
    }
    for (const f of NUTRIENT_FIELDS) if (before.nutrition[f] !== after.nutrition[f]) n++;
    return n;
}

export function LabelScanner({ availability, tier, remaining: initialRemaining, profiles, activeId, initialExtraction }: Props) {
    const t = useTranslations("Label");
    const tScore = useTranslations("ScoreMessages");
    const tProduct = useTranslations("Product");

    const [step, setStep] = useState<Step>(initialExtraction ? "review" : "capture");
    const [consent, setConsent] = useState(false);
    const [remaining, setRemaining] = useState(initialRemaining);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [extraction, setExtraction] = useState<Extraction | null>(initialExtraction ?? null);
    const [draft, setDraft] = useState<Draft | null>(initialExtraction ? toDraft(initialExtraction.form) : null);
    const [formError, setFormError] = useState(false);
    const [result, setResult] = useState<{ score: ScoreResult; verdicts: { id: string; name: string; verdict: PersonalVerdict }[]; incomplete: boolean } | null>(null);
    const [selectedProfile, setSelectedProfile] = useState(activeId ?? profiles[0]?.id ?? "");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const initialDraft = useMemo(() => (extraction ? toDraft(extraction.form) : null), [extraction]);

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setErrorCode(null);
        setStep("reading");
        trackEvent("photo_scan_started");
        try {
            const blob = await prepareLabelPhoto(file);
            const body = new FormData();
            body.set("image", blob, "label.jpg");
            body.set("consent", tier);
            const res = await fetch("/api/label-scan", { method: "POST", body });
            const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string; extraction?: Extraction; remaining?: number } | null;
            if (!data?.ok || !data.extraction) {
                const code = isLabelErrorCode(data?.error) ? data.error : "generic";
                trackEvent("photo_scan_failed", { reason: code });
                setErrorCode(code);
                setStep("capture");
                return;
            }
            if (typeof data.remaining === "number") setRemaining(data.remaining);
            setExtraction(data.extraction);
            setDraft(toDraft(data.extraction.form));
            setPreviewUrl(URL.createObjectURL(blob));
            setStep("review");
        } catch {
            trackEvent("photo_scan_failed", { reason: "client" });
            setErrorCode("unreadable_file");
            setStep("capture");
        }
    }

    function reset() {
        setStep("capture");
        setExtraction(null);
        setDraft(null);
        setResult(null);
        setFormError(false);
        setErrorCode(null);
        setPreviewUrl(null);
    }

    function compute() {
        if (!draft) return;
        const parsed = labelFormSchema.safeParse(fromDraft(draft));
        if (!parsed.success) {
            setFormError(true);
            return;
        }
        setFormError(false);
        const product = labelToProduct(parsed.data);
        const score = scoreProduct(product);
        const verdicts = profiles.map((p) => ({ id: p.id, name: p.name, verdict: evaluateProduct(product, p.profile, score.score) }));
        setResult({ score, verdicts, incomplete: !parsed.data.ingredientsComplete });
        if (initialDraft) trackEvent("photo_scan_edited", { fields: countEdits(initialDraft, draft) });
        trackEvent("photo_scan_accepted");
        setStep("result");
    }

    const header = (
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("title")}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("subtitle")}</p>
        </div>
    );

    // ---------- not available here ----------
    if (availability !== "ready") {
        return (
            <div className="mx-auto max-w-lg px-4 py-8">
                {header}
                <div role="status" className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                    <p className="font-semibold">{t(`unavailable.${availability}.title`)}</p>
                    <p className="mt-2">{t(`unavailable.${availability}.body`)}</p>
                </div>
                <Link href="/scan" className="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400">{t("backToBarcode")}</Link>
            </div>
        );
    }

    // ---------- capture ----------
    if (step === "capture" || step === "reading") {
        const reading = step === "reading";
        const limitReached = remaining <= 0;
        return (
            <div className="mx-auto max-w-lg space-y-5 px-4 py-8">
                {header}

                <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900" aria-labelledby="label-consent">
                    <h2 id="label-consent" className="font-semibold text-neutral-900 dark:text-neutral-50">{t(`consent.${tier}.title`)}</h2>
                    <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{t(`consent.${tier}.body`)}</p>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
                        <li>{t("consent.labelOnly")}</li>
                        <li>{t("consent.notStored")}</li>
                        <li>{t("consent.reviewYourself")}</li>
                    </ul>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-500" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={reading} />
                        <span>{t(`consent.${tier}.agree`)}</span>
                    </label>
                </section>

                {errorCode && (
                    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <p>{t(`errors.${errorCode}`)}</p>
                    </div>
                )}

                {reading ? (
                    <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-8 text-center dark:border-neutral-800">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" aria-hidden />
                        <p className="font-semibold text-neutral-900 dark:text-neutral-50">{t("reading")}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("readingDesc")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
                        <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
                        <Button size="lg" className="w-full" disabled={!consent || limitReached} onClick={() => cameraRef.current?.click()}>
                            <Camera aria-hidden /> {t("takePhoto")}
                        </Button>
                        <Button variant="outline" className="w-full" disabled={!consent || limitReached} onClick={() => galleryRef.current?.click()}>
                            <ImagePlus aria-hidden /> {t("choosePhoto")}
                        </Button>
                        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                            {limitReached ? t("limitReached") : t("remaining", { count: remaining })}
                        </p>
                    </div>
                )}

                <ul className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <li>{t("tip1")}</li>
                    <li>{t("tip2")}</li>
                    <li>{t("tip3")}</li>
                </ul>
                <Link href="/scan" className="inline-block text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400">{t("backToBarcode")}</Link>
            </div>
        );
    }

    // ---------- review ----------
    if (step === "review" && draft && extraction) {
        const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
        const warnings = extraction.warnings;
        const warningText = (w: LabelWarning) => t(`warnings.${w.code}`, { field: w.field ? t(`nutrients.${w.field}`) : "" });
        return (
            <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
                {header}
                <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900 dark:bg-orange-950/30 dark:text-orange-100">{t("review.intro")}</p>

                {warnings.length > 0 && (
                    <ul role="status" className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                        {warnings.map((w, i) => (
                            <li key={`${w.code}-${w.field ?? i}`} className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{warningText(w)}</li>
                        ))}
                    </ul>
                )}

                {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob URL, never uploaded again
                    <img src={previewUrl} alt={t("review.photoAlt")} className="max-h-64 w-full rounded-2xl border border-neutral-200 object-contain dark:border-neutral-800" />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="lbl-name" label={t("review.name")}><Input id="lbl-name" value={draft.productName} maxLength={120} onChange={(e) => set("productName", e.target.value)} /></Field>
                    <Field id="lbl-brand" label={t("review.brand")}><Input id="lbl-brand" value={draft.brand} maxLength={120} onChange={(e) => set("brand", e.target.value)} /></Field>
                    <Field id="lbl-kind" label={t("review.kind")}>
                        <select id="lbl-kind" value={draft.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])} className="h-11 w-full rounded-xl border-2 border-neutral-200 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-900">
                            {KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
                        </select>
                    </Field>
                </div>

                <Field id="lbl-ingredients" label={t("review.ingredients")} hint={t("review.ingredientsHint")}>
                    <textarea id="lbl-ingredients" rows={5} maxLength={4000} value={draft.ingredientsText} onChange={(e) => set("ingredientsText", e.target.value)} className="w-full rounded-xl border-2 border-neutral-200 bg-white p-3 text-base dark:border-neutral-700 dark:bg-neutral-900" />
                </Field>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-500" checked={draft.ingredientsComplete} onChange={(e) => set("ingredientsComplete", e.target.checked)} />
                    <span><span className="font-semibold text-neutral-900 dark:text-neutral-50">{t("review.complete")}</span><br /><span className="text-neutral-500 dark:text-neutral-400">{t("review.completeHint")}</span></span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="lbl-contains" label={t("review.contains")} hint={t("review.listHint")}><Input id="lbl-contains" value={draft.allergensContains} onChange={(e) => set("allergensContains", e.target.value)} /></Field>
                    <Field id="lbl-may" label={t("review.mayContain")} hint={t("review.listHint")}><Input id="lbl-may" value={draft.allergensMayContain} onChange={(e) => set("allergensMayContain", e.target.value)} /></Field>
                </div>

                <fieldset>
                    <legend className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t(draft.kind === "drink" ? "review.nutritionPer100ml" : "review.nutritionPer100g")}</legend>
                    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {NUTRIENT_FIELDS.map((f) => (
                            <Field key={f} id={`lbl-n-${f}`} label={t(`nutrients.${f}`)}>
                                <Input id={`lbl-n-${f}`} inputMode="decimal" value={draft.nutrition[f]} onChange={(e) => setDraft({ ...draft, nutrition: { ...draft.nutrition, [f]: e.target.value } })} />
                            </Field>
                        ))}
                    </div>
                </fieldset>

                {formError && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{t("review.invalid")}</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" className="flex-1" onClick={compute}>{t("review.confirm")}</Button>
                    <Button variant="outline" size="lg" onClick={reset}><RotateCcw aria-hidden /> {t("review.retake")}</Button>
                </div>
            </div>
        );
    }

    // ---------- result ----------
    if (step === "result" && result) {
        const current = result.verdicts.find((v) => v.id === selectedProfile) ?? result.verdicts[0];
        const name = (draft?.productName || t("untitled")).trim();
        return (
            <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
                {header}
                <div className="flex items-center gap-4">
                    <ScoreBadge score={result.score.score} letter={result.score.letter} color={result.score.color} size="lg" />
                    <div className="min-w-0">
                        <p className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-50">{name}</p>
                        {draft?.brand && <p className="text-sm text-neutral-500 dark:text-neutral-400">{draft.brand}</p>}
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("result.fromPhoto")}</p>
                    </div>
                </div>

                {result.incomplete && (
                    <p role="status" className="flex gap-2 rounded-xl border border-neutral-300 bg-neutral-100 p-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t("result.incomplete")}
                    </p>
                )}

                {current && (
                    <div className="space-y-2">
                        {result.verdicts.length > 1 && (
                            <div className="flex items-center gap-2">
                                <label htmlFor="lbl-profile" className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{t("result.profile")}</label>
                                <select id="lbl-profile" value={current.id} onChange={(e) => setSelectedProfile(e.target.value)} className="h-10 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                                    {result.verdicts.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                        )}
                        <PersonalScoreCard verdict={current.verdict} profileName={current.name} />
                    </div>
                )}

                {result.score.positives.length > 0 && (
                    <section aria-labelledby="lbl-pos"><h2 id="lbl-pos" className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{tProduct("positivesTitle")}</h2>
                        <ul className="space-y-2">{result.score.positives.map((p, i) => <li key={i} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{resolveScoreAspectMessage(p, tScore)}</li>)}</ul></section>
                )}
                {result.score.negatives.length > 0 && (
                    <section aria-labelledby="lbl-neg"><h2 id="lbl-neg" className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">{tProduct("negativesTitle")}</h2>
                        <ul className="space-y-2">{result.score.negatives.map((p, i) => <li key={i} className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{resolveScoreAspectMessage(p, tScore)}</li>)}</ul></section>
                )}

                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t("result.notSaved")}</p>
                <MedicalDisclaimer variant="inline" />

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("review")}>{t("result.edit")}</Button>
                    <Button className="flex-1" onClick={reset}><Camera aria-hidden /> {t("result.another")}</Button>
                </div>
            </div>
        );
    }

    return null;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{label}</label>
            {children}
            {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
        </div>
    );
}
