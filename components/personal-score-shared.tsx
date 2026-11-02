import { AlertTriangle, CheckCircle2, CircleHelp, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AllergyOption } from "@/lib/allergens";
import { ALLERGY_I18N_KEYS } from "@/lib/allergy-i18n";
import type { PersonalReason, ReasonLevel, VerdictStatus } from "@/lib/profiles/evaluate";

// Shared by the "Score for you" card and the "check for everyone" table.
// Colour is never the only signal: every state also has an icon and a text label.

export const STATUS_STYLE: Record<VerdictStatus, { box: string; text: string; Icon: typeof ShieldAlert }> = {
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

export const REASON_STYLE: Record<ReasonLevel, { Icon: typeof ShieldAlert; icon: string }> = {
    block: { Icon: ShieldAlert, icon: "text-red-600 dark:text-red-400" },
    caution: { Icon: AlertTriangle, icon: "text-amber-600 dark:text-amber-400" },
    unknown: { Icon: CircleHelp, icon: "text-neutral-500 dark:text-neutral-400" },
    good: { Icon: CheckCircle2, icon: "text-emerald-600 dark:text-emerald-400" },
};

/** Translate an allergen label and a verdict reason into the current language. */
export function useReasonText() {
    const tReasons = useTranslations("PersonalScore.reasons");
    const tProfile = useTranslations("Profile");

    const allergenName = (allergen: AllergyOption) => tProfile(ALLERGY_I18N_KEYS[allergen]);

    const reasonText = (r: PersonalReason) =>
        tReasons(r.key, {
            ...r.params,
            ...(r.allergen ? { allergen: allergenName(r.allergen) } : {}),
        });

    return { allergenName, reasonText };
}
