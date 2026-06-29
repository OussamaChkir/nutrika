import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

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
                    <p><strong>{t("lastUpdated", { date: new Date().toLocaleDateString() })}</strong></p>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t("section1Title")}</h2>
                    <p>{t("section1Content")}</p>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t("section2Title")}</h2>
                    <p>{t("section2Content")}</p>
                    <ul className="list-disc list-inside">
                        <li>{t("section2List1")}</li>
                        <li>{t("section2List2")}</li>
                        <li>{t("section2List3")}</li>
                        <li>{t("section2List4")}</li>
                    </ul>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t("section3Title")}</h2>
                    <p>{t("section3Content")}</p>
                    <ul className="list-disc list-inside">
                        <li>{t("section3List1")}</li>
                        <li>{t("section3List2")}</li>
                        <li>{t("section3List3")}</li>
                        <li>{t("section3List4")}</li>
                    </ul>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t("section4Title")}</h2>
                    <p>{t("section4Content")}</p>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t("section5Title")}</h2>
                    <p>{t("section5Content")}</p>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">{t("section6Title")}</h2>
                    <p>{t("section6Content")}</p>
                </div>
            </section>
        </div>
    );
}
