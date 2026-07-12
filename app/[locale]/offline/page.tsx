"use client";

import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        {/* Animated icon */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-full bg-orange-100 dark:bg-orange-950/40 animate-ping opacity-30 scale-110" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-950/60 dark:to-orange-900/40 flex items-center justify-center shadow-lg">
            <WifiOff className="w-10 h-10 text-orange-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-3">
          You&apos;re offline
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-base leading-relaxed mb-8">
          It looks like you&apos;ve lost your internet connection. Check your
          network and try again. Pages you&apos;ve visited recently may still be
          available.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            {isRetrying ? "Retrying…" : "Try again"}
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Go home
          </Link>
        </div>

        {/* Brand */}
        <p className="mt-12 text-sm text-neutral-400 dark:text-neutral-600">
          NutrikaFood — Smart Food Scanner
        </p>
      </div>
    </div>
  );
}
