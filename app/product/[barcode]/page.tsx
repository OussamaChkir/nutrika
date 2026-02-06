import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
    fetchProductByBarcode,
    getProductName,
    getProductImage,
} from "@/lib/openfoodfacts";
import { calculateScore } from "@/lib/scoring";
import { ScoreBadge } from "@/components/score-badge";
import { PositivesList } from "@/components/positives-list";
import { NegativesList } from "@/components/negatives-list";
import { AllergenTags } from "@/components/allergen-tags";
import { NutritionTable } from "@/components/nutrition-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, ExternalLink, Share2 } from "lucide-react";

interface ProductPageProps {
    params: Promise<{ barcode: string }>;
}

export async function generateMetadata({
    params,
}: ProductPageProps): Promise<Metadata> {
    const { barcode } = await params;

    // Try to get from database first
    const dbProduct = await prisma.product.findUnique({
        where: { barcode },
    });

    if (dbProduct) {
        return {
            title: dbProduct.name,
            description: `${dbProduct.name} by ${dbProduct.brand || "Unknown Brand"} - Score: ${dbProduct.scoreLetter} (${dbProduct.score}/100)`,
        };
    }

    return {
        title: `Product ${barcode}`,
        description: `View nutritional analysis for product ${barcode}`,
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { barcode } = await params;

    // 1. Try to find in database first
    let product = await prisma.product.findUnique({
        where: { barcode },
    });

    // 2. If not in database, fetch from Open Food Facts
    if (!product) {
        const offProduct = await fetchProductByBarcode(barcode);

        if (!offProduct) {
            notFound();
        }

        // Calculate score
        const scoreResult = calculateScore(offProduct);

        // Save to database
        product = await prisma.product.create({
            data: {
                barcode,
                name: getProductName(offProduct),
                brand: offProduct.brands || null,
                imageUrl: getProductImage(offProduct),
                offData: offProduct as object,
                score: scoreResult.score,
                scoreLetter: scoreResult.letter,
                scoreColor: scoreResult.color,
                positives: scoreResult.positives.map(p => ({ text: p.text, icon: p.icon })),
                negatives: scoreResult.negatives.map(n => ({ text: n.text, icon: n.icon })),
                allergens: scoreResult.allergens.map((a) => a.name),
                allergensSeverity: scoreResult.allergensSeverity,
                energy: offProduct.nutriments?.energy_kcal_100g || offProduct.nutriments?.energy_100g,
                fat: offProduct.nutriments?.fat_100g,
                saturatedFat: offProduct.nutriments?.["saturated-fat_100g"],
                carbohydrates: offProduct.nutriments?.carbohydrates_100g,
                sugars: offProduct.nutriments?.sugars_100g,
                fiber: offProduct.nutriments?.fiber_100g,
                proteins: offProduct.nutriments?.proteins_100g,
                salt: offProduct.nutriments?.salt_100g,
                status: "APPROVED",
            },
        });
    }

    // Parse stored JSON data
    const positives = (product.positives as { text: string; icon?: string }[]) || [];
    const negatives = (product.negatives as { text: string; icon?: string }[]) || [];
    const allergens = product.allergens.map((name: string) => ({
        name,
        severity: product.allergensSeverity,
    }));

    return (
        <div className="mx-auto max-w-2xl px-4 py-6">
            {/* Back button */}
            <Link href="/scan" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to scanner
            </Link>

            {/* Product header */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    {/* Product image and basic info */}
                    <div className="flex gap-4 p-6">
                        {/* Image */}
                        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-contain p-2"
                                    sizes="112px"
                                    priority
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-4xl">
                                    📦
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                                {product.name}
                            </h1>
                            {product.brand && (
                                <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                                    {product.brand}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-neutral-400">
                                Barcode: {product.barcode}
                            </p>
                        </div>
                    </div>

                    {/* Score badge - prominent display */}
                    <div className="flex justify-center border-t border-neutral-100 bg-neutral-50/50 py-6 dark:border-neutral-800 dark:bg-neutral-900/50">
                        <ScoreBadge
                            score={product.score}
                            letter={product.scoreLetter as "A" | "B" | "C" | "D" | "E"}
                            color={product.scoreColor}
                            size="lg"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Analysis sections */}
            <div className="mt-6 space-y-6">
                {/* Positives */}
                {positives.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <PositivesList items={positives} />
                        </CardContent>
                    </Card>
                )}

                {/* Negatives */}
                {negatives.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <NegativesList items={negatives} />
                        </CardContent>
                    </Card>
                )}

                {/* Allergens */}
                <Card>
                    <CardContent className="p-4">
                        <AllergenTags
                            allergens={allergens}
                            overallSeverity={product.allergensSeverity}
                        />
                    </CardContent>
                </Card>

                {/* Nutrition table */}
                <Card>
                    <CardContent className="p-4">
                        <NutritionTable
                            nutrition={{
                                energy: product.energy,
                                fat: product.fat,
                                saturatedFat: product.saturatedFat,
                                carbohydrates: product.carbohydrates,
                                sugars: product.sugars,
                                fiber: product.fiber,
                                proteins: product.proteins,
                                salt: product.salt,
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/add-product?barcode=${barcode}&edit=true`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                        <Edit className="h-4 w-4" />
                        Suggest Edit
                    </Button>
                </Link>
                <a
                    href={`https://world.openfoodfacts.org/product/${barcode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                >
                    <Button variant="outline" className="w-full gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Open Food Facts
                    </Button>
                </a>
            </div>

            {/* Data source */}
            <p className="mt-6 text-center text-xs text-neutral-400">
                Data from{" "}
                <a
                    href="https://world.openfoodfacts.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                >
                    Open Food Facts
                </a>
                . Last updated: {product.updatedAt.toLocaleDateString()}
            </p>
        </div>
    );
}
