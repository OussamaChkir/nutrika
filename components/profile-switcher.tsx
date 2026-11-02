"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { setActiveProfile } from "@/app/[locale]/profile/personal/actions";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";

interface ProfileSwitcherProps {
    profiles: { id: string; name: string }[];
    activeId: string;
}

/** One-tap switch between the account's profiles (F4). Reloads the page data on success. */
export function ProfileSwitcher({ profiles, activeId }: ProfileSwitcherProps) {
    const t = useTranslations("PersonalScore.switcher");
    const tErrors = useTranslations("PersonalProfile.errors");
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

    function choose(id: string) {
        if (id === activeId) return;
        setError(null);
        startTransition(async () => {
            const result = await setActiveProfile(id);
            if (!result.ok) {
                setError(tErrors(result.error, { max: 0 }));
                return;
            }
            trackEvent("profile_switched");
            router.refresh();
        });
    }

    if (profiles.length < 2) return null;

    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" aria-label={t("aria")} disabled={pending} className="gap-2">
                        {pending ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="max-w-[10rem] truncate">{active.name}</span>
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
                    {profiles.map((p) => (
                        <DropdownMenuItem key={p.id} onSelect={() => choose(p.id)} className="gap-2">
                            <Check className={p.id === activeId ? "h-4 w-4" : "h-4 w-4 opacity-0"} aria-hidden="true" />
                            <span className="truncate">{p.name}</span>
                            {p.id === activeId && <span className="ml-auto text-xs text-neutral-500">{t("active")}</span>}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {error && (
                <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-300">
                    {error}
                </p>
            )}
        </div>
    );
}
