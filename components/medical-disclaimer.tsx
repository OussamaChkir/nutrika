import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface MedicalDisclaimerProps {
    /** "banner": title + text in a box (default). "inline": one small muted line. */
    variant?: "banner" | "inline";
    className?: string;
}

/**
 * Global "not medical advice" notice.
 *
 * Reuse it on EVERY screen that shows health-related content (health profile, allergen
 * warnings, personal score, "may contain" mode, ...). Keep the wording in one place:
 * messages/*.json, namespace `MedicalDisclaimer`.
 */
export function MedicalDisclaimer({ variant = "banner", className }: MedicalDisclaimerProps) {
    const t = useTranslations("MedicalDisclaimer");

    if (variant === "inline") {
        return (
            <p
                role="note"
                className={cn("text-xs text-neutral-500 dark:text-neutral-400", className)}
            >
                {t("body")}
            </p>
        );
    }

    return (
        <div
            role="note"
            className={cn(
                "flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900",
                "dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
                className
            )}
        >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-0.5">
                <p className="font-semibold">{t("title")}</p>
                <p className="text-xs leading-relaxed opacity-90">{t("body")}</p>
            </div>
        </div>
    );
}
