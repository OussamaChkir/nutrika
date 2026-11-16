import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PersonalScoreCtaProps {
    /** "signed_out": invite to sign in. "no_profile": invite to create a first profile. */
    variant: "signed_out" | "no_profile";
}

/** Shown instead of the card when there is no profile to judge the product for. */
export function PersonalScoreCta({ variant }: PersonalScoreCtaProps) {
    const t = useTranslations("PersonalScore.cta");
    const signedOut = variant === "signed_out";

    return (
        <section className="flex items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <UserRound className="h-6 w-6 shrink-0 text-orange-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {signedOut ? t("signedOutTitle") : t("noProfileTitle")}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {signedOut ? t("signedOutText") : t("noProfileText")}
                </p>
            </div>
            <Link href={signedOut ? "/sign-in" : "/profile/personal"}>
                <Button size="sm" variant="outline">
                    {signedOut ? t("signIn") : t("createProfile")}
                </Button>
            </Link>
        </section>
    );
}
