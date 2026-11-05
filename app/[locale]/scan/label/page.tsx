import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { LabelScanner, type LabelScannerProfile, type LabelAvailability } from "@/components/label-scanner";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
import { checkRegion, parseTier, PER_USER_PER_DAY } from "@/lib/label/access";
import { isValidModelName } from "@/lib/label/gemini";
import { remainingScans } from "@/lib/label/server";
import { pickActiveProfile } from "@/lib/profiles/active";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profiles/constants";
import { toPersonalProfile } from "@/lib/profiles/profile";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Label" });
    return { ...constructMetadata({ title: `${t("title")} | Nutrika`, description: t("subtitle"), locale, path: "/scan/label" }), robots: { index: false } };
}

export default async function LabelScanPage() {
    if (!isFeatureEnabled("labelScan")) notFound();
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/sign-in");

    const tier = parseTier(process.env.GEMINI_TIER);
    const configured = Boolean(process.env.GEMINI_API_KEY?.trim()) && isValidModelName(process.env.GEMINI_MODEL?.trim() ?? "");
    const region = checkRegion(tier, (await headers()).get("x-vercel-ip-country"));
    const availability: LabelAvailability = !configured ? "not_configured" : region.allowed ? "ready" : region.reason;

    let remaining = PER_USER_PER_DAY;
    let profiles: LabelScannerProfile[] = [];
    let activeId: string | null = null;
    try {
        remaining = await remainingScans(userId, PER_USER_PER_DAY);
        if (isFeatureEnabled("personalScore")) {
            const rows = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
            const active = pickActiveProfile(rows, (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value);
            activeId = active?.id ?? null;
            profiles = rows.map((row: Parameters<typeof toPersonalProfile>[0]) => ({ id: row.id, name: row.name, profile: toPersonalProfile(row) }));
        }
    } catch (error) {
        console.error("Label scan page: could not load limits or profiles:", error instanceof Error ? error.message : "unknown error");
    }

    return <LabelScanner availability={availability} tier={tier} remaining={remaining} profiles={profiles} activeId={activeId} />;
}
