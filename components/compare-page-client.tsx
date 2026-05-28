"use client";

import { useCompare } from "@/components/compare-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, X, Scale, ChevronRight, AlertTriangle, CircleAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompareProduct {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    score: number;
    scoreLetter: "A" | "B" | "C" | "D" | "E";
    scoreColor: string;
    energy: number;
    fat: number;
    saturatedFat: number;
    carbohydrates: number;
    sugars: number;
    fiber: number;
    proteins: number;
    salt: number;
    novaGroup?: number;
    ecoscoreGrade?: string;
    allergens: { name: string; severity: "LOW" | "MEDIUM" | "HIGH" }[];
    allergensSeverity: "LOW" | "MEDIUM" | "HIGH";
    negatives: { key?: string; text?: string; icon?: string }[];
}

interface ComparePageClientProps {
    products: CompareProduct[];
}

// Helper: determine which value is "better" for comparison coloring
function getNutrientColor(
    key: string,
    value: number,
    allValues: number[]
): string {
    if (allValues.length < 2) return "text-neutral-800 dark:text-neutral-200";

    const validValues = allValues.filter((v) => v !== undefined);
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    if (min === max) return "text-neutral-800 dark:text-neutral-200";

    // For fiber and protein: higher is better
    const higherIsBetter = key === "fiber" || key === "proteins";

    if (higherIsBetter) {
        if (value === max) return "text-emerald-600 dark:text-emerald-400";
        if (value === min) return "text-red-500 dark:text-red-400";
    } else {
        if (value === min) return "text-emerald-600 dark:text-emerald-400";
        if (value === max) return "text-red-500 dark:text-red-400";
    }
    return "text-amber-600 dark:text-amber-400";
}

// Get a short "tag" description for a product based on its negatives/score
function getProductTag(product: CompareProduct): {
    label: string;
    color: string;
} | null {
    const negKeys = product.negatives.map((n) => n.key || "");

    if (negKeys.includes("nova4"))
        return {
            label: "ULTRA PROCESSED",
            color: "text-red-600 dark:text-red-400",
        };
    if (negKeys.includes("veryHighSugar"))
        return {
            label: "VERY HIGH SUGAR",
            color: "text-red-600 dark:text-red-400",
        };
    if (negKeys.includes("highSugar"))
        return {
            label: "MODERATE SUGAR",
            color: "text-orange-600 dark:text-orange-400",
        };
    if (negKeys.includes("highSaturatedFat"))
        return {
            label: "HIGH FAT",
            color: "text-red-600 dark:text-red-400",
        };
    if (negKeys.includes("highSalt"))
        return {
            label: "HIGH SALT",
            color: "text-red-600 dark:text-red-400",
        };
    if (negKeys.includes("nova3"))
        return {
            label: "PROCESSED",
            color: "text-orange-600 dark:text-orange-400",
        };

    if (product.score >= 85)
        return {
            label: "EXCELLENT",
            color: "text-emerald-600 dark:text-emerald-400",
        };
    if (product.score >= 70)
        return {
            label: "GOOD CHOICE",
            color: "text-lime-600 dark:text-lime-400",
        };

    return null;
}

export function ComparePageClient({ products }: ComparePageClientProps) {
    const { removeFromCompare } = useCompare();
    const router = useRouter();
    const t = useTranslations("Compare");
    const tProd = useTranslations("Product");

    const handleRemove = (barcode: string) => {
        removeFromCompare(barcode);
        const remaining = products
            .filter((p) => p.barcode !== barcode)
            .map((p) => p.barcode);
        if (remaining.length === 0) {
            router.push("/compare");
        } else {
            router.push(`/compare?ids=${remaining.join(",")}`);
        }
    };

    if (products.length === 0) {
        return (
            <div className="mx-auto max-w-lg px-4 py-16 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <Scale className="h-10 w-10 text-neutral-400 dark:text-neutral-600" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {t("title")}
                </h1>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                    {t("empty")}
                </p>
                <Link href="/scan" className="mt-8 inline-block">
                    <Button className="gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-3 text-white shadow-lg shadow-orange-400/30 hover:shadow-xl hover:shadow-orange-400/40 transition-all">
                        {t("addProducts")}
                    </Button>
                </Link>
            </div>
        );
    }

    const nutritionRows = [
        { key: "energy", label: tProd("nutritionEnergy"), unit: "kcal" },
        { key: "fat", label: tProd("nutritionFat"), unit: "g" },
        { key: "saturatedFat", label: tProd("nutritionSaturatedFat"), unit: "g" },
        { key: "carbohydrates", label: tProd("nutritionCarbohydrates"), unit: "g" },
        { key: "sugars", label: tProd("nutritionSugars"), unit: "g" },
        { key: "fiber", label: tProd("nutritionFiber"), unit: "g" },
        { key: "proteins", label: tProd("nutritionProteins"), unit: "g" },
        { key: "salt", label: tProd("nutritionSalt"), unit: "g" },
    ];

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
            {/* Header */}
            <div className="mb-8 flex items-start gap-4">
                <Link
                    href="/scan"
                    className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                        {t("title")}
                    </h1>
                    <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 dark:text-orange-400">
                        {t("subtitle")}
                    </p>
                </div>
            </div>

            {/* ===== PRODUCT CARDS ===== */}
            <div
                className={`grid gap-4 mb-6 ${
                    products.length === 1
                        ? "grid-cols-1 max-w-xs mx-auto"
                        : "grid-cols-2"
                }`}
            >
                {products.map((product) => (
                    <div
                        key={product.barcode}
                        className="relative rounded-2xl bg-white p-4 shadow-md shadow-neutral-200/60 dark:bg-neutral-900 dark:shadow-neutral-950/40 border border-neutral-100 dark:border-neutral-800"
                    >
                        {/* Remove button */}
                        <button
                            onClick={() => handleRemove(product.barcode)}
                            className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 shadow-sm transition-all hover:bg-red-100 hover:text-red-500 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-red-900/40 dark:hover:text-red-400"
                            title={t("removeFromCompare")}
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Image */}
                        <div className="relative mx-auto mb-3 h-28 w-28 overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-contain p-2"
                                    sizes="112px"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl">
                                    📦
                                </div>
                            )}
                        </div>

                        {/* Name & brand */}
                        <h3 className="text-center text-sm font-bold leading-tight text-neutral-900 dark:text-neutral-100 line-clamp-2">
                            {product.name}
                        </h3>
                        {product.brand && (
                            <p className="mt-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 truncate">
                                {product.brand}
                            </p>
                        )}

                        {/* View details link */}
                        <Link
                            href={`/product/${product.barcode}`}
                            className="mt-3 flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wide text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                        >
                            {t("viewDetails")}
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                ))}
            </div>

            {/* ===== SCORES ===== */}
            <div
                className={`grid gap-4 mb-8 ${
                    products.length === 1
                        ? "grid-cols-1 max-w-xs mx-auto"
                        : "grid-cols-2"
                }`}
            >
                {products.map((product) => {
                    const tag = getProductTag(product);
                    return (
                        <div
                            key={product.barcode}
                            className="flex flex-col items-center rounded-2xl bg-white p-5 shadow-md shadow-neutral-200/60 dark:bg-neutral-900 dark:shadow-neutral-950/40 border border-neutral-100 dark:border-neutral-800"
                        >
                            {/* Score badge */}
                            <div
                                className="mb-3 flex h-24 w-24 flex-col items-center justify-center rounded-2xl text-white shadow-xl transition-transform hover:scale-105"
                                style={{
                                    backgroundColor: product.scoreColor,
                                    boxShadow: `0 10px 30px -5px ${product.scoreColor}40`,
                                }}
                            >
                                <span className="text-4xl font-bold leading-none">
                                    {product.scoreLetter}
                                </span>
                                <span className="mt-0.5 text-xs font-medium opacity-80">
                                    {product.score}/100
                                </span>
                            </div>

                            {/* NOVA badge */}
                            {product.novaGroup && (
                                <span className="mb-2 inline-flex items-center rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                    NOVA {product.novaGroup}
                                </span>
                            )}

                            {/* Tag */}
                            {tag && (
                                <span
                                    className={`text-[11px] font-bold uppercase tracking-wider ${tag.color}`}
                                >
                                    {tag.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ===== ALLERGENS & WARNINGS ===== */}
            <div className="mb-8 rounded-2xl bg-white p-5 shadow-md shadow-neutral-200/60 dark:bg-neutral-900 dark:shadow-neutral-950/40 border border-neutral-100 dark:border-neutral-800">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    {t("allergensTitle")}
                </h2>
                <div
                    className={`grid gap-4 ${
                        products.length === 1
                            ? "grid-cols-1"
                            : "grid-cols-2"
                    }`}
                >
                    {products.map((product) => (
                        <div key={product.barcode} className="space-y-2">
                            {product.allergens.length === 0 ? (
                                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    <Info className="h-3.5 w-3.5" />
                                    {t("noAllergens")}
                                </div>
                            ) : (
                                product.allergens.map((allergen, idx) => {
                                    const isMayContain = allergen.name
                                        .toLowerCase()
                                        .startsWith("may contain");
                                    const displayName = isMayContain
                                        ? allergen.name
                                        : `Contains: ${allergen.name}`;

                                    let iconColor = "text-amber-500";
                                    let bgColor =
                                        "bg-amber-50 dark:bg-amber-900/20";
                                    let textColor =
                                        "text-amber-700 dark:text-amber-400";

                                    if (allergen.severity === "HIGH") {
                                        iconColor = "text-red-500";
                                        bgColor =
                                            "bg-red-50 dark:bg-red-900/20";
                                        textColor =
                                            "text-red-700 dark:text-red-400";
                                    } else if (isMayContain) {
                                        iconColor = "text-orange-400";
                                        bgColor =
                                            "bg-orange-50 dark:bg-orange-900/20";
                                        textColor =
                                            "text-orange-600 dark:text-orange-400";
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${bgColor}`}
                                        >
                                            {isMayContain ? (
                                                <CircleAlert
                                                    className={`h-3.5 w-3.5 shrink-0 ${iconColor}`}
                                                />
                                            ) : (
                                                <AlertTriangle
                                                    className={`h-3.5 w-3.5 shrink-0 ${iconColor}`}
                                                />
                                            )}
                                            <span
                                                className={`text-xs font-semibold tracking-wide ${textColor}`}
                                            >
                                                {displayName}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== NUTRITION FACTS ===== */}
            <div className="rounded-2xl bg-white shadow-md shadow-neutral-200/60 dark:bg-neutral-900 dark:shadow-neutral-950/40 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                        {t("nutritionTitle")}
                    </h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                        {t("per100g")}
                    </span>
                </div>

                {/* Column header */}
                <div className="grid border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/30"
                    style={{ gridTemplateColumns: `1fr ${products.map(() => "1fr").join(" ")}` }}
                >
                    <div className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                        {t("nutrient")}
                    </div>
                    {products.map((product, idx) => (
                        <div
                            key={product.barcode}
                            className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
                        >
                            {t("prodLabel", { num: idx + 1 })}
                        </div>
                    ))}
                </div>

                {/* Rows */}
                {nutritionRows.map((row, rowIdx) => {
                    const values = products.map(
                        (p) => p[row.key as keyof CompareProduct] as number
                    );
                    return (
                        <div
                            key={row.key}
                            className={`grid items-center border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 ${
                                rowIdx % 2 === 0
                                    ? ""
                                    : "bg-neutral-50/40 dark:bg-neutral-800/15"
                            }`}
                            style={{ gridTemplateColumns: `1fr ${products.map(() => "1fr").join(" ")}` }}
                        >
                            <div className="px-5 py-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {row.label}
                            </div>
                            {products.map((product, idx) => {
                                const val = product[
                                    row.key as keyof CompareProduct
                                ] as number;
                                const color = getNutrientColor(
                                    row.key,
                                    val,
                                    values
                                );
                                return (
                                    <div
                                        key={product.barcode}
                                        className={`px-3 py-4 text-center text-sm font-bold ${color}`}
                                    >
                                        {val !== undefined
                                            ? `${Number(val).toFixed(1)}${row.unit}`
                                            : "-"}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
