import { getTranslations } from "next-intl/server";
import {
    fetchProductByBarcode,
    getProductName,
    getProductImage,
    parseAllergens,
} from "@/lib/openfoodfacts";
import { calculateScore } from "@/lib/scoring";
import { Metadata } from "next";
import { ComparePageClient } from "@/components/compare-page-client";

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
    const { ids } = await searchParams;

    const barcodes =
        typeof ids === "string" ? ids.split(",").filter(Boolean) : [];

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
                scoreLetter: scoreResult.letter as
                    | "A"
                    | "B"
                    | "C"
                    | "D"
                    | "E",
                scoreColor: scoreResult.color,
                energy:
                    offProduct.nutriments?.energy_kcal_100g ||
                    offProduct.nutriments?.energy_100g ||
                    0,
                fat: offProduct.nutriments?.fat_100g || 0,
                saturatedFat:
                    offProduct.nutriments?.["saturated-fat_100g"] || 0,
                carbohydrates:
                    offProduct.nutriments?.carbohydrates_100g || 0,
                sugars: offProduct.nutriments?.sugars_100g || 0,
                fiber: offProduct.nutriments?.fiber_100g || 0,
                proteins: offProduct.nutriments?.proteins_100g || 0,
                salt: offProduct.nutriments?.salt_100g || 0,
                novaGroup: offProduct.nova_group,
                ecoscoreGrade: offProduct.ecoscore_grade,
                allergens: scoreResult.allergens,
                allergensSeverity: scoreResult.allergensSeverity,
                negatives: scoreResult.negatives.map((n) => ({
                    key: n.key,
                    text: n.text,
                    icon: n.icon,
                })),
            };
        })
    );

    const validProducts = productsData.filter(
        (p): p is NonNullable<typeof p> => p !== null
    );

    return <ComparePageClient products={validProducts} />;
}
