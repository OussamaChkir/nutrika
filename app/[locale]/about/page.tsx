import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
    Scan,
    LineChart,
    Bell,
    CandyOff,
    CircleAlert,
    Salad,
    Factory,
    FlaskConical,
    Leaf,
    ShieldCheck,
    ArrowRight,
    Target,
    Lightbulb,
} from "lucide-react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations("About");
    return constructMetadata({
        title: t("metaTitle"),
        description: t("metaDescription"),
        locale,
        path: "/about"
    });
}

export default async function AboutPage() {
    const t = await getTranslations("About");

    const whatWeDoFeatures = [
        {
            icon: Scan,
            titleKey: "featureScanTitle" as const,
            descKey: "featureScanDesc" as const,
            bgColor: "bg-blue-100 dark:bg-blue-900/30",
            iconColor: "text-blue-500",
        },
        {
            icon: LineChart,
            titleKey: "featureScoringTitle" as const,
            descKey: "featureScoringDesc" as const,
            bgColor: "bg-orange-100 dark:bg-orange-900/30",
            iconColor: "text-orange-500",
        },
        {
            icon: Bell,
            titleKey: "featureAlertsTitle" as const,
            descKey: "featureAlertsDesc" as const,
            bgColor: "bg-orange-100 dark:bg-orange-900/30",
            iconColor: "text-orange-500",
        },
    ];

    const scoreFactors = [
        {
            icon: CandyOff,
            labelKey: "factorSugarLabel" as const,
            pointsKey: "factorSugarPoints" as const,
            detailKey: "factorSugarDetail" as const,
            pointsColor: "text-red-500",
            bgColor: "bg-red-100 dark:bg-red-900/30",
            iconColor: "text-red-500",
        },
        {
            icon: CircleAlert,
            labelKey: "factorSaltLabel" as const,
            pointsKey: "factorSaltPoints" as const,
            detailKey: "factorSaltDetail" as const,
            pointsColor: "text-red-500",
            bgColor: "bg-orange-100 dark:bg-orange-900/30",
            iconColor: "text-orange-500",
        },
        {
            icon: Salad,
            labelKey: "factorFiberLabel" as const,
            pointsKey: "factorFiberPoints" as const,
            detailKey: "factorFiberDetail" as const,
            pointsColor: "text-emerald-500",
            bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
            iconColor: "text-emerald-500",
        },
        {
            icon: Factory,
            labelKey: "factorNovaLabel" as const,
            pointsKey: "factorNovaPoints" as const,
            detailKey: "factorNovaDetail" as const,
            pointsColor: "text-neutral-600 dark:text-neutral-400",
            bgColor: "bg-neutral-100 dark:bg-neutral-800",
            iconColor: "text-neutral-600 dark:text-neutral-400",
        },
        {
            icon: FlaskConical,
            labelKey: "factorAdditivesLabel" as const,
            pointsKey: "factorAdditivesPoints" as const,
            detailKey: "factorAdditivesDetail" as const,
            pointsColor: "text-red-500",
            bgColor: "bg-rose-100 dark:bg-rose-900/30",
            iconColor: "text-rose-500",
        },
        {
            icon: Leaf,
            labelKey: "factorOrganicLabel" as const,
            pointsKey: "factorOrganicPoints" as const,
            detailKey: "factorOrganicDetail" as const,
            pointsColor: "text-emerald-500",
            bgColor: "bg-green-100 dark:bg-green-900/30",
            iconColor: "text-green-600",
        },
    ];

    const grades = [
        { letter: "A", rangeKey: "gradeA" as const, color: "bg-emerald-500" },
        { letter: "B", rangeKey: "gradeB" as const, color: "bg-lime-500" },
        { letter: "C", rangeKey: "gradeC" as const, color: "bg-orange-400" },
        { letter: "D", rangeKey: "gradeD" as const, color: "bg-red-500" },
        { letter: "E", rangeKey: "gradeE" as const, color: "bg-red-800" },
    ];

    return (
        <div className="flex flex-col w-full min-h-screen">
            {/* ===== HERO ===== */}
            <section className="relative overflow-hidden px-4 py-24 md:py-32 flex flex-col items-center justify-center">
                <div className="absolute inset-0 -z-10 animate-gradient bg-[length:200%_200%] bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30" />
                <div className="absolute top-20 left-[10%] w-64 h-64 bg-orange-400/20 dark:bg-orange-500/10 rounded-full blur-3xl animate-float-slow" />
                <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-orangina-300/20 dark:bg-orangina-400/10 rounded-full blur-3xl animate-float" />

                <div className="relative z-10 mx-auto max-w-3xl text-center animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-100/80 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 text-sm font-semibold text-orange-600 dark:text-orange-400 mb-8 backdrop-blur-sm">
                        {t("heroBadge")}
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6 leading-[1.1]">
                        {t("heroAbout")}{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orangina-300">
                            {t("heroBrand")}
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-medium max-w-xl mx-auto leading-relaxed">
                        {t("heroDesc")}
                    </p>
                </div>
            </section>

            {/* ===== OUR MISSION & WHY WE BUILT ===== */}
            <section className="px-4 py-20 bg-white dark:bg-neutral-950">
                <div className="mx-auto max-w-3xl space-y-14 animate-fade-in-up delay-100">
                    <div className="flex gap-5">
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Target className="w-5 h-5 text-orange-500" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                                {t("missionTitle")}
                            </h2>
                            <p className="text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed">
                                {t("missionDesc")}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-5">
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Lightbulb className="w-5 h-5 text-orange-500" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                                {t("whyBuiltTitle")}
                            </h2>
                            <p className="text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed">
                                {t("whyBuiltDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== WHAT WE DO ===== */}
            <section className="px-4 py-20 bg-neutral-50/50 dark:bg-neutral-900/20 border-t border-neutral-100 dark:border-neutral-900">
                <div className="mx-auto max-w-3xl">
                    <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-10 animate-fade-in-up">
                        {t("whatWeDoTitle")}
                    </h2>

                    <div className="space-y-4 animate-fade-in-up delay-100">
                        {whatWeDoFeatures.map((feature, i) => (
                            <div
                                key={i}
                                className="group flex items-center gap-5 p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60 hover:shadow-lg hover:shadow-neutral-200/20 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div
                                    className={`flex-shrink-0 w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <feature.icon
                                        className={`w-6 h-6 ${feature.iconColor}`}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                                        {t(feature.titleKey)}
                                    </h3>
                                    <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                                        {t(feature.descKey)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== HOW WE CALCULATE SCORES ===== */}
            <section className="px-4 py-20 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-center gap-3 mb-4 animate-fade-in-up">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                            <LineChart className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100">
                            {t("scoresTitle")}
                        </h2>
                    </div>
                    <p className="mb-4 text-neutral-600 dark:text-neutral-400">
                        {t("scoresIntro")}
                    </p>

                    <div className="space-y-3 animate-fade-in-up delay-200">
                        {scoreFactors.map((factor, i) => (
                            <div
                                key={i}
                                className="group flex items-center gap-4 p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-900/80 hover:shadow-md transition-all duration-300"
                            >
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-xl ${factor.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                                >
                                    <factor.icon
                                        className={`w-5 h-5 ${factor.iconColor}`}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                                        {t(factor.labelKey)}
                                    </h4>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5 hidden md:block">
                                        {t(factor.detailKey)}
                                    </p>
                                </div>
                                <span
                                    className={`flex-shrink-0 font-bold text-sm ${factor.pointsColor}`}
                                >
                                    {t(factor.pointsKey)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 animate-fade-in-up delay-300">
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-900/20">
                            <h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-200">
                                {t("nutriscoreBlendTitle")}
                            </h4>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                {t("nutriscoreBlendDesc")}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 animate-fade-in-up delay-400">
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                            {t("gradeScaleTitle")}
                        </h4>
                        <div className="flex flex-wrap gap-3">
                            {grades.map((grade) => (
                                <div
                                    key={grade.letter}
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/50 dark:border-neutral-800/50"
                                >
                                    <span
                                        className={`w-8 h-8 rounded-lg ${grade.color} text-white font-bold text-sm flex items-center justify-center shadow-sm`}
                                    >
                                        {grade.letter}
                                    </span>
                                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                        {t(grade.rangeKey)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== TRUST & TRANSPARENCY ===== */}
            <section className="px-4 py-20 bg-neutral-50/50 dark:bg-neutral-900/20 border-t border-neutral-100 dark:border-neutral-900">
                <div className="mx-auto max-w-3xl animate-fade-in-up">
                    <div className="rounded-3xl bg-neutral-900 dark:bg-neutral-800/80 p-8 md:p-12 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold">
                                    {t("trustTitle")}
                                </h2>
                            </div>

                            <p className="text-neutral-300 text-lg leading-relaxed mb-8">
                                {t("trustDesc")}
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold tracking-wide text-white backdrop-blur-sm">
                                    {t("badgeIndependent")}
                                </span>
                                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold tracking-wide text-white backdrop-blur-sm">
                                    {t("badgeDataProtection")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CTA ===== */}
            <section className="px-4 py-16 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
                <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
                    <Link href="/scan">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto h-16 px-12 text-lg font-bold shadow-lg shadow-orange-500/30 animate-pulse-glow gap-3 bg-gradient-to-r from-orange-500 to-orangina-300 hover:from-orange-600 hover:to-orange-400 text-white border-0 transition-all hover:scale-105 rounded-2xl"
                        >
                            <Scan className="w-6 h-6" />
                            {t("ctaButton")}
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
