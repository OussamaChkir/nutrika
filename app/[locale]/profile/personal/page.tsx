import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ALLERGY_OPTIONS } from "@/lib/allergens";
import { isFeatureEnabled } from "@/lib/flags";
import { MAX_PROFILES_PER_USER } from "@/lib/profiles/constants";
import { toProfileDto } from "@/lib/profiles/profile";
import { constructMetadata } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";

import { PersonalProfileManager } from "./personal-profile-manager";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "PersonalProfile" });
    return constructMetadata({ title: t("metaTitle"), locale, path: "/profile/personal" });
}

export default async function PersonalProfilePage() {
    // Behind a flag: until it is on, the page does not exist.
    if (!isFeatureEnabled("personalScore")) notFound();

    const session = await auth();
    if (!session?.user?.id) {
        redirect({ href: "/sign-in", locale: await getLocale() });
        return null;
    }

    const t = await getTranslations("PersonalProfile");

    const [rows, legacy] = await Promise.all([
        prisma.profile.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } }),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { allergies: true } }),
    ]);

    // Allergies already saved on the account pre-fill the first profile (the user still confirms them).
    const legacyAllergies = (legacy?.allergies ?? []).filter((a): a is (typeof ALLERGY_OPTIONS)[number] =>
        (ALLERGY_OPTIONS as readonly string[]).includes(a)
    );

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <Link
                href="/profile"
                className="mb-5 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:hover:text-neutral-300"
            >
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("title")}</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t("intro")}</p>

            <PersonalProfileManager
                initialProfiles={rows.map(toProfileDto)}
                legacyAllergies={legacyAllergies}
                maxProfiles={MAX_PROFILES_PER_USER}
            />
        </div>
    );
}
