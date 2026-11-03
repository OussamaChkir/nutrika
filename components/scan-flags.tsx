"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";
import type { ScanFlag } from "@/lib/shopping/flags";

const STYLE: Record<ScanFlag["severity"], { box: string; Icon: typeof Info }> = {
    warning: { box: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100", Icon: TriangleAlert },
    caution: { box: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100", Icon: Info },
    positive: { box: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100", Icon: CircleCheck },
};

/** F3: what the user's own choices say about this product. Icon and text, never colour alone. */
export function ScanFlags({ flags }: { flags: ScanFlag[] }) {
    const t = useTranslations("Shopping.flags");
    const kinds = flags.map((f) => f.kind).join(",");

    useEffect(() => {
        for (const kind of kinds.split(",").filter(Boolean)) trackEvent("flag_shown", { kind });
    }, [kinds]);

    if (flags.length === 0) return null;
    return (
        <ul aria-label={t("label")} className="mt-4 space-y-2">
            {flags.map((flag) => {
                const { box, Icon } = STYLE[flag.severity];
                return (
                    <li key={flag.kind} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${box}`}>
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span>{t(flag.kind, flag.params)}</span>
                    </li>
                );
            })}
        </ul>
    );
}
