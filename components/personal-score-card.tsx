import { AlertTriangle, CheckCircle2, CircleHelp, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ALLERGY_I18N_KEYS } from "@/lib/allergy-i18n";
import type { AllergyOption } from "@/lib/allergens";
import type { PersonalReason, PersonalVerdict, ReasonLevel, VerdictStatus } from "@/lib/profiles/evaluate";
import { cn } from "@/lib/utils";

import { MedicalDisclaimer } from "./medical-disclaimer";

interface PersonalScoreCardProps {
    verdict: PersonalVerdict;
    /** Nickname of the profile the verdict is for. */
    profileName: string;
    className?: string;
}

// Colour is never the only signal: every state also has an icon and a text label.
const STATUS_STYLE: Record<VerdictStatus, { box: string; text: string; Icon: typeof ShieldAlert }> = {
    not_suitable: {
        box: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
        text: "text-red-800 dark:text-red-200",
        Icon: ShieldAlert,
    },
    caution: {
        box: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
        text: "text-amber-900 dark:text-amber-100",
        Icon: AlertTriangle,
    },
    cannot_verify: {
        box: "border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/60",
        text: "text-neutral-800 dark:text-neutral-100",
        Icon: ShieldQuestion,
    },
    good_match: {
        box: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
        text: "text-emerald-900 dark:text-emerald-100",
        Icon: ShieldCheck,
    },
    neutral: {
        box: "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        text: "text-neutral-800 dark:text-neutral-100",
        Icon: CircleHelp,
    },
};

const GROUP_ORDER: ReasonLevel[] = ["block", "caution", "unknown", "good"];

const REASON_STYLE: Record<ReasonLevel, { Icon: typeof ShieldAlert; icon: string }> = {
    block: { Icon: ShieldAlert, icon: "text-red-600 dark:text-red-400" },
    caution: { Icon: AlertTriangle, icon: "text-amber-600 dark:text-amber-400" },
    unknown: { Icon: CircleHelp, icon: "text-neutral-500 dark:text-neutral-400" },
    good: { Icon: CheckCircle2, icon: "text-emerald-600 dark:text-emerald-400" },
};

/**
 * "Score for you": the same product judged for one profile (F1), with the allergen banner of
 * the "may contain" safety mode (F7). The universal score stays visible elsewhere on the page.
 */
export function PersonalScoreCard({ verdict, profileName, className }: PersonalScoreCardProps) {
    const t = useTranslations("PersonalScore");
    const tReasons = useTranslations("PersonalScore.reasons");
    const tBecause = useTranslations("PersonalScore.because");
    const tProfile = useTranslations("Profile");
    const locale = useLocale();

    const allergenName = (allergen: AllergyOption) => tProfile(ALLERGY_I18N_KEYS[allergen]);

    const style = STATUS_STYLE[verdict.status];
    const StatusIcon = style.Icon;

    const reasonText = (r: PersonalReason) =>
        tReasons(r.key, {
            ...r.params,
            ...(r.allergen ? { allergen: allergenName(r.allergen) } : {}),
        });

    const findingsOf = (kind: "contains" | "may_contain") =>
        verdict.allergenFindings.filter((f) => f.kind === kind).map((f) => allergenName(f.allergen));

    const banner = (() => {
        switch (verdict.allergenState) {
            case "contains":
                return { level: "not_suitable" as const, text: t("banner.contains", { allergens: findingsOf("contains").join(", ") }) };
            case "may_contain":
                return {
                    level: verdict.status === "not_suitable" ? ("not_suitable" as const) : ("caution" as const),
                    text: t("banner.may_contain", { allergens: findingsOf("may_contain").join(", ") }),
                };
            case "unknown":
                return { level: "cannot_verify" as const, text: t("banner.unknown") };
            case "none_found":
                return { level: "good_match" as const, text: t("banner.none_found") };
            default:
                return null;
        }
    })();

    const grouped = GROUP_ORDER.map((level) => ({
        level,
        reasons: verdict.reasons.filter((r) => r.level === level),
    })).filter((g) => g.reasons.length > 0);

    const updated = verdict.lastModified
        ? new Date(verdict.lastModified * 1000).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
          })
        : null;

    return (
        <section
            aria-label={t("title")}
            className={cn("rounded-2xl border p-4 shadow-sm", style.box, className)}
        >
            <div className="flex items-start gap-3">
                <StatusIcon className={cn("mt-0.5 h-6 w-6 shrink-0", style.text)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        {t("title")} · {t("forProfile", { name: profileName })}
                    </p>
                    <p className={cn("text-lg font-bold leading-tight", style.text)}>{t(`status.${verdict.status}`)}</p>
                </div>
                <div className="text-right">
                    {verdict.personalScore !== null ? (
                        <p className={cn("text-2xl font-extrabold tabular-nums", style.text)}>
                            {t("scoreOutOf", { score: verdict.personalScore })}
                        </p>
                    ) : null}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t("universal", { score: verdict.universalScore })}
                    </p>
                </div>
            </div>

            {verdict.personalScore === null && (
                <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">{t("scoreHidden")}</p>
            )}

            {banner && (
                <div
                    role={banner.level === "not_suitable" ? "alert" : "status"}
                    className={cn(
                        "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                        STATUS_STYLE[banner.level].box,
                        STATUS_STYLE[banner.level].text
                    )}
                >
                    {(() => {
                        const BannerIcon = STATUS_STYLE[banner.level].Icon;
                        return <BannerIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />;
                    })()}
                    <span>{banner.text}</span>
                </div>
            )}

            {verdict.status === "neutral" && verdict.reasons.length === 0 && (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{t("neutralHint")}</p>
            )}

            {grouped.length > 0 && (
                <div className="mt-3 space-y-3">
                    {grouped.map(({ level, reasons }) => (
                        <div key={level}>
                            <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                {t(`groups.${level}`)}
                            </h4>
                            <ul className="space-y-1.5">
                                {reasons.map((r, i) => {
                                    const { Icon, icon } = REASON_STYLE[r.level];
                                    return (
                                        <li key={`${r.key}-${r.allergen ?? i}`} className="flex items-start gap-2 text-sm text-neutral-800 dark:text-neutral-100">
                                            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", icon)} aria-hidden="true" />
                                            <span className="flex-1">{reasonText(r)}</span>
                                            <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                                                {tBecause(r.because)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {t(`completeness.${verdict.dataCompleteness}`)}
                {updated ? ` · ${t("dataUpdated", { date: updated })}` : ""}
            </p>

            <MedicalDisclaimer variant="inline" className="mt-2" />
        </section>
    );
}
