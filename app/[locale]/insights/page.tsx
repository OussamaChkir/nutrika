import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { InsightsControls } from "@/components/insights-controls";
import { InsightsView } from "@/components/insights-view";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/flags";
import { loadInsights } from "@/lib/insights/load";
import { constructMetadata } from "@/lib/seo";

import { deleteScanEvents, setScanInsights } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Insights" });
    return constructMetadata({ title: `${t("title")} | Nutrika`, description: t("subtitle"), locale, path: "/insights" });
}

export default async function InsightsPage() {
    if (!isFeatureEnabled("scanInsights")) notFound();
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/sign-in");

    const t = await getTranslations("Insights");
    const { enabled, recordsCount, result, profileName } = await loadInsights(userId);

    return (
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <BarChart3 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("title")}</h1>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("subtitle")}</p>
                </div>
            </div>

            {enabled && <InsightsView result={result} profileName={profileName} />}

            <InsightsControls enabled={enabled} recordsCount={recordsCount} actions={{ setEnabled: setScanInsights, deleteAll: deleteScanEvents }} />

            <MedicalDisclaimer variant="inline" />
        </div>
    );
}
