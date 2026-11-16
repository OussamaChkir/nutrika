"use client";

// Shown by the service worker when a page cannot be loaded without a connection.
//
// The browser keeps the address of the page the user wanted. If that was a product page and
// offline mode is on, the product is looked up on this device and the full verdict is shown here
// (F8). Otherwise this is the plain "you are offline" screen.
//
// The page is served from the cache in the default language, so the language is read from the
// NEXT_LOCALE cookie and the matching messages are bundled with this page.

import { ArrowLeft, RefreshCw, ScanLine, WifiOff } from "lucide-react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { OfflineLookup } from "@/components/offline-lookup";
import { Link } from "@/i18n/routing";
import { isFeatureEnabled } from "@/lib/flags";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const PRODUCT_PATH = /^\/(?:(?:en|fr)\/)?product\/(\d{8,14})\/?$/;

function readLocale(): "en" | "fr" {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|fr)\b/);
    return match?.[1] === "fr" ? "fr" : "en";
}

const noopSubscribe = () => () => undefined;
// A string snapshot ("fr|20000001") is compared by value, so React sees no change between renders.
const clientSnapshot = () => `${readLocale()}|${isFeatureEnabled("offlineMode") ? (window.location.pathname.match(PRODUCT_PATH)?.[1] ?? "") : ""}`;

export default function OfflinePage() {
    // The server render, and the first client render, use English and no product, so hydration matches.
    const snapshot = useSyncExternalStore(noopSubscribe, clientSnapshot, () => "en|");
    const [localeCode, code] = snapshot.split("|");
    const locale = localeCode === "fr" ? "fr" : "en";

    return (
        <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en}>
            {code ? <OfflineLookup barcode={code} /> : <OfflineMessage />}
        </NextIntlClientProvider>
    );
}

function OfflineMessage() {
    const t = useTranslations("Offline.page");
    const [isRetrying, setIsRetrying] = useState(false);

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="mx-auto max-w-md text-center">
                <div className="relative mb-8 inline-flex items-center justify-center">
                    <div className="absolute inset-0 scale-110 animate-ping rounded-full bg-orange-100 opacity-30 dark:bg-orange-950/40" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200 shadow-lg dark:from-orange-950/60 dark:to-orange-900/40">
                        <WifiOff className="h-10 w-10 text-orange-500" strokeWidth={1.5} aria-hidden />
                    </div>
                </div>

                <h1 className="mb-3 text-3xl font-bold text-neutral-900 dark:text-neutral-50">{t("title")}</h1>
                <p className="mb-8 text-base leading-relaxed text-neutral-500 dark:text-neutral-400">{t("body")}</p>

                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                        onClick={() => {
                            setIsRetrying(true);
                            setTimeout(() => window.location.reload(), 500);
                        }}
                        disabled={isRetrying}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg active:translate-y-0 disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} aria-hidden />
                        {isRetrying ? t("retrying") : t("retry")}
                    </button>
                    {isFeatureEnabled("offlineMode") && (
                        <Link href="/scan" className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-6 py-3 font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                            <ScanLine className="h-4 w-4" aria-hidden />
                            {t("scan")}
                        </Link>
                    )}
                    <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-6 py-3 font-semibold text-neutral-700 transition-all duration-200 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        {t("home")}
                    </Link>
                </div>

                <p className="mt-12 text-sm text-neutral-400 dark:text-neutral-600">NutrikaFood — Smart Food Scanner</p>
            </div>
        </div>
    );
}
