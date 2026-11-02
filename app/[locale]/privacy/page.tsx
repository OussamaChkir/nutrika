import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PRIVACY_SECTIONS } from "@/lib/privacy-sections";

// Bump this whenever the policy text changes.
const POLICY_LAST_UPDATED = "2026-11-02";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Privacy" });
    return constructMetadata({
        title: t("metaTitle"),
        description: t("metaDescription"),
        locale,
        path: "/privacy"
    });
}

export default function PrivacyPage() {
    const t = useTranslations("Privacy");
    const locale = useLocale();
    const lastUpdated = new Date(`${POLICY_LAST_UPDATED}T00:00:00Z`).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });
    return (
        <div className="flex flex-col w-full min-h-screen">
            <section className="relative overflow-hidden px-4 py-20 bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30">
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6">
                        {t("title")}
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-medium">
                        {t("subtitle")}
                    </p>
                </div>
            </section>
            
            <section className="px-4 py-16">
                <div className="mx-auto max-w-3xl prose prose-lg prose-orange dark:prose-invert">
                    <p><strong>{t("lastUpdated", { date: lastUpdated })}</strong></p>
                    
                    {PRIVACY_SECTIONS.map(({ id, list = 0 }) => (
                        <section key={id} id={id}>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t(`${id}Title`)}</h2>
                            <p>{t(`${id}Content`)}</p>
                            {list > 0 && (
                                <ul className="list-disc list-inside">
                                    {Array.from({ length: list }, (_, i) => (
                                        <li key={i}>{t(`${id}List${i + 1}`)}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            </section>
        </div>
    );
}
