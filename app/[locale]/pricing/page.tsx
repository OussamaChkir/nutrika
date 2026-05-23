import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Check,
    X,
    Scan,
    Star,
    Shield,
    Zap,
    Crown,
    BarChart3,
    Download,
    MessageSquare,
    Search,
    Bell,
    Sparkles,
} from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return constructMetadata({
        title: "Pricing | Nutrika",
        description: "Compare Nutrika Free and Premium plans. Unlock advanced features, personalized health insights, and more.",
        locale,
        path: "/pricing"
    });
}

const FREE_FEATURES = [
    { text: "Scan product barcodes", icon: Scan, included: true },
    { text: "View nutrition scores (A-E)", icon: BarChart3, included: true },
    { text: "Nutrition facts table", icon: Check, included: true },
    { text: "Allergen alerts", icon: Bell, included: true },
    { text: "Search products", icon: Search, included: true },
    { text: "Positives & negatives analysis", icon: Check, included: true },
    { text: "Manufacturing places info", icon: Check, included: true },
    { text: "Personalized health insights", icon: Sparkles, included: false },
    { text: "Product ratings & reviews", icon: MessageSquare, included: false },
    { text: "Export scan history", icon: Download, included: false },
    { text: "Ad-free experience", icon: Shield, included: false },
    { text: "Priority support", icon: Zap, included: false },
];

const PREMIUM_FEATURES = [
    { text: "Everything in Free", icon: Check, included: true },
    { text: "Personalized health recommendations", icon: Sparkles, included: true },
    { text: "Product ratings & detailed reviews", icon: MessageSquare, included: true },
    { text: "Advanced search filters", icon: Search, included: true },
    { text: "Export scan history (CSV / PDF)", icon: Download, included: true },
    { text: "Ad-free experience", icon: Shield, included: true },
    { text: "Priority support", icon: Zap, included: true },
    { text: "Early access to new features", icon: Star, included: true },
    { text: "Custom allergen profiles", icon: Bell, included: true },
    { text: "Product comparison tool", icon: BarChart3, included: true },
];

export default function PricingPage() {
    return (
        <div className="flex flex-col">
            {/* Hero */}
            <section className="relative overflow-hidden px-4 py-16 md:py-20">
                {/* Background decoration */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-orangina-300/30 to-orange-300/30 blur-3xl dark:from-orangina-900/15 dark:to-orange-900/15" />
                </div>

                <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        <Crown className="h-4 w-4" />
                        Choose Your Plan
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-5xl">
                        Unlock the Full Power of{" "}
                        <span className="bg-gradient-to-r from-orange-400 to-orangina-300 bg-clip-text text-transparent">
                            Nutrika
                        </span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                        Start free and upgrade whenever you need more. Premium gives you
                        personalized insights and advanced tools for healthier eating.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="px-4 mt-4 pb-16 md:pb-24">
                <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
                    {/* Free Card */}
                    <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-0">
                            {/* Card Header */}
                            <div className="border-b border-neutral-100 p-6 dark:border-neutral-800">
                                <p className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                    Free
                                </p>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">
                                        0 DT
                                    </span>
                                    <span className="text-neutral-500">/ forever</span>
                                </div>
                                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                                    Perfect for getting started with healthier food choices.
                                </p>
                                <Link href="/sign-up" className="block mt-5">
                                    <Button
                                        variant="outline"
                                        className="w-full text-base"
                                        size="lg"
                                    >
                                        Get Started
                                    </Button>
                                </Link>
                            </div>

                            {/* Features */}
                            <div className="p-6">
                                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                    What&apos;s included
                                </p>
                                <ul className="space-y-3">
                                    {FREE_FEATURES.map((feature, idx) => (
                                        <li
                                            key={idx}
                                            className={`flex items-center gap-3 text-sm ${feature.included
                                                ? "text-neutral-700 dark:text-neutral-300"
                                                : "text-neutral-400 dark:text-neutral-600"
                                                }`}
                                        >
                                            {feature.included ? (
                                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                            ) : (
                                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                    <X className="h-3 w-3 text-neutral-400" />
                                                </div>
                                            )}
                                            <span className={!feature.included ? "line-through" : ""}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Premium Card */}
                    <Card className="relative overflow-hidden border-2 border-orange-300 shadow-xl shadow-orange-400/10 dark:border-orange-700">
                        {/* Popular Badge */}
                        <div className="absolute right-4 top-4 z-10">
                            <div className="rounded-full bg-gradient-to-r from-orange-400 to-orangina-300 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-orange-400/30">
                                ★ Most Popular
                            </div>
                        </div>

                        <CardContent className="p-0">
                            {/* Card Header */}
                            <div className="border-b border-orange-100 bg-gradient-to-br from-orange-50 to-orangina-50/50 p-6 dark:border-orange-900/30 dark:from-orange-950/30 dark:to-orangina-950/20">
                                <p className="text-sm font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                    Premium
                                </p>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-neutral-900 dark:text-neutral-100">
                                        9.99 DT
                                    </span>
                                    <span className="text-neutral-500">/ month</span>
                                </div>
                                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    For health-conscious users who want full control.
                                </p>
                                <Link href="/sign-up" className="block mt-5">
                                    <Button
                                        className="w-full gap-2 text-base shadow-lg shadow-orange-400/20"
                                        size="lg"
                                    >
                                        <Crown className="h-5 w-5" />
                                        Get Premium
                                    </Button>
                                </Link>
                            </div>

                            {/* Features */}
                            <div className="p-6">
                                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                    Everything you get
                                </p>
                                <ul className="space-y-3">
                                    {PREMIUM_FEATURES.map((feature, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300"
                                        >
                                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orangina-300">
                                                <Check className="h-3 w-3 text-white" />
                                            </div>
                                            {feature.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* FAQ Teaser */}
                <div className="mx-auto mt-16 max-w-2xl text-center">
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Questions?{" "}
                        <Link
                            href="/about"
                            className="font-medium text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            Learn more about Nutrika
                        </Link>{" "}
                        or contact us anytime.
                    </p>
                </div>
            </section>
        </div>
    );
}
