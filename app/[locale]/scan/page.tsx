"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Keyboard, Scan, Loader2 } from "lucide-react";

export default function ScanPage() {
    const t = useTranslations("Scan");
    const router = useRouter();
    const [manualBarcode, setManualBarcode] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    const handleScan = (barcode: string) => {
        setIsNavigating(true);
        router.push(`/product/${barcode}`);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = manualBarcode.trim();

        if (!trimmed) {
            setError(t("errorEmpty"));
            return;
        }

        if (!/^\d{8,14}$/.test(trimmed)) {
            setError(t("errorFormat"));
            return;
        }

        setIsNavigating(true);
        router.push(`/product/${trimmed}`);
    };

    return (
        <div className="mx-auto max-w-lg px-4 py-8">
            {/* Loading overlay */}
            {isNavigating && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-neutral-950/80">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-neutral-200 dark:border-neutral-700" />
                            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-orange-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                {t("analyzing")}
                            </p>
                            <p className="mt-1 text-sm text-neutral-500">
                                {t("analyzingDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {t("title")}
                </h1>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    {t("subtitle")}
                </p>
            </div>

            {/* Scanner */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <BarcodeScanner
                        onScan={handleScan}
                        onError={(err) => setError(err)}
                    />
                </CardContent>
            </Card>

            {/* Toggle to manual input */}
            <div className="mt-6 text-center">
                <Button
                    variant="ghost"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="gap-2"
                >
                    <Keyboard className="h-4 w-4" />
                    {showManualInput ? t("useCamera") : t("useManual")}
                </Button>
            </div>

            {/* Manual barcode input */}
            {showManualInput && (
                <Card className="mt-4">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{t("manualEntry")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleManualSubmit}
                            className="flex gap-2"
                        >
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder={t("manualPlaceholder")}
                                value={manualBarcode}
                                onChange={(e) => {
                                    setManualBarcode(e.target.value);
                                    setError(null);
                                }}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isNavigating}>
                                <Scan className="h-4 w-4" />
                            </Button>
                        </form>
                        {error && (
                            <p className="mt-2 text-sm text-red-600">
                                {error}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tips */}
            <div className="mt-8 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {t("tipsTitle")}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <li>
                        • {t("tip1")}
                    </li>
                    <li>• {t("tip2")}</li>
                    <li>
                        • {t("tip3")}
                    </li>
                </ul>
            </div>
        </div>
    );
}
