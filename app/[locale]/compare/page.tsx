import { getTranslations } from "next-intl/server";
import { fetchProductByBarcode, getProductName, getProductImage } from "@/lib/openfoodfacts";
import { calculateScore } from "@/lib/scoring";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Trash2, Scale } from "lucide-react";
import Image from "next/image";
import { ScoreBadge } from "@/components/score-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const t = await getTranslations("Compare");
    return {
        title: t("metaTitle"),
        description: t("description"),
    };
}

export default async function ComparePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const t = await getTranslations("Compare");
    const tProd = await getTranslations("Product");
    const { ids } = await searchParams;

    const barcodes = typeof ids === "string" ? ids.split(",").filter(Boolean) : [];

    if (barcodes.length === 0) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-12 text-center">
                <Scale className="mx-auto h-16 w-16 text-neutral-300 dark:text-neutral-700 mb-4" />
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t("title")}</h1>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">{t("empty")}</p>
                <Link href="/scan" className="mt-6 inline-block">
                    <Button>{t("addProducts")}</Button>
                </Link>
            </div>
        );
    }

    // Fetch all products concurrently
    const productsData = await Promise.all(
        barcodes.map(async (barcode) => {
            const offProduct = await fetchProductByBarcode(barcode);
            if (!offProduct) return null;

            const scoreResult = calculateScore(offProduct);
            return {
                barcode,
                name: getProductName(offProduct),
                brand: offProduct.brands || null,
                imageUrl: getProductImage(offProduct),
                score: scoreResult.score,
                scoreLetter: scoreResult.letter as "A" | "B" | "C" | "D" | "E",
                scoreColor: scoreResult.color,
                energy: offProduct.nutriments?.energy_kcal_100g || offProduct.nutriments?.energy_100g || 0,
                fat: offProduct.nutriments?.fat_100g || 0,
                saturatedFat: offProduct.nutriments?.["saturated-fat_100g"] || 0,
                carbohydrates: offProduct.nutriments?.carbohydrates_100g || 0,
                sugars: offProduct.nutriments?.sugars_100g || 0,
                fiber: offProduct.nutriments?.fiber_100g || 0,
                proteins: offProduct.nutriments?.proteins_100g || 0,
                salt: offProduct.nutriments?.salt_100g || 0,
                novaGroup: offProduct.nova_group,
                ecoscoreGrade: offProduct.ecoscore_grade,
            };
        })
    );

    const validProducts = productsData.filter((p): p is NonNullable<typeof p> => p !== null);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link
                        href="/scan"
                        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-3 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("backToScanner")}
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                        {t("description")}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto pb-6">
                <div className="min-w-[800px] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-neutral-200/50 dark:shadow-neutral-900/50 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-r border-neutral-200 dark:border-neutral-800 w-48 font-medium text-neutral-500 dark:text-neutral-400 sticky left-0 z-10">
                                    {t("productInfo")}
                                </th>
                                {validProducts.map((product) => (
                                    <th key={product.barcode} className="p-4 border-b border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 min-w-[250px] align-top bg-white dark:bg-neutral-900">
                                        <div className="flex flex-col h-full">
                                            <div className="relative h-32 w-full mb-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl overflow-hidden p-2">
                                                {product.imageUrl ? (
                                                    <Image
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        fill
                                                        className="object-contain"
                                                        sizes="(max-width: 768px) 100vw, 250px"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-3xl">📦</div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-lg leading-tight text-neutral-900 dark:text-neutral-100">{product.name}</h3>
                                            {product.brand && (
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">{product.brand}</p>
                                            )}
                                            <Link href={`/product/${product.barcode}`} className="mt-4 mt-auto">
                                                <Button variant="outline" className="w-full">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* SCORES ROW */}
                            <tr className="bg-neutral-50/50 dark:bg-neutral-800/20">
                                <td className="p-4 border-b border-r border-neutral-200 dark:border-neutral-800 font-medium text-neutral-700 dark:text-neutral-300 sticky left-0 bg-neutral-50/90 dark:bg-neutral-800/90 backdrop-blur-md z-10">
                                    {t("scoreAndImpact")}
                                </td>
                                {validProducts.map((product) => (
                                    <td key={product.barcode} className="p-4 border-b border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <ScoreBadge
                                                score={product.score}
                                                letter={product.scoreLetter}
                                                color={product.scoreColor}
                                                size="md"
                                            />
                                            <div className="flex items-center gap-2 text-xs font-medium">
                                                {product.novaGroup && (
                                                    <span className="px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                                                        NOVA {product.novaGroup}
                                                    </span>
                                                )}
                                                {product.ecoscoreGrade && product.ecoscoreGrade !== 'unknown' && (
                                                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">
                                                        ECO {product.ecoscoreGrade}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* NUTRITION HEADER */}
                            <tr>
                                <td colSpan={validProducts.length + 1} className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/50 font-bold text-neutral-900 dark:text-neutral-100">
                                    {t("nutritionPer100g")}
                                </td>
                            </tr>

                            {/* NUTRITION ROWS */}
                            {[
                                { key: "energy", label: tProd("nutritionEnergy"), unit: "kcal" },
                                { key: "fat", label: tProd("nutritionFat"), unit: "g" },
                                { key: "saturatedFat", label: tProd("nutritionSaturatedFat"), unit: "g" },
                                { key: "carbohydrates", label: tProd("nutritionCarbohydrates"), unit: "g" },
                                { key: "sugars", label: tProd("nutritionSugars"), unit: "g" },
                                { key: "fiber", label: tProd("nutritionFiber"), unit: "g" },
                                { key: "proteins", label: tProd("nutritionProteins"), unit: "g" },
                                { key: "salt", label: tProd("nutritionSalt"), unit: "g" },
                            ].map((row, idx) => (
                                <tr key={row.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                    <td className="p-4 border-b border-r border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-600 dark:text-neutral-400 sticky left-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md z-10">
                                        {row.label}
                                    </td>
                                    {validProducts.map((product) => {
                                        const val = product[row.key as keyof typeof product] as number;
                                        return (
                                            <td key={product.barcode} className="p-4 border-b border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                                {val !== undefined ? `${Number(val).toFixed(1)}${row.unit}` : "-"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
