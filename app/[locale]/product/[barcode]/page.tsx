import { notFound } from "next/navigation";
import Image from "next/image";
import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    fetchProductByBarcode,
    getProductName,
    getProductImage,
    fetchBetterAlternatives,
} from "@/lib/openfoodfacts";
import { calculateScore } from "@/lib/scoring";
import { parseScoreAspects } from "@/lib/score-messages";
import { ScoreBadge } from "@/components/score-badge";
import { PositivesList } from "@/components/positives-list";
import { NegativesList } from "@/components/negatives-list";
import { AllergenTags } from "@/components/allergen-tags";
import { NutritionTable } from "@/components/nutrition-table";
import { ProductBasicDetails } from "@/components/product-basic-details";
import { AdvancedNutrition } from "@/components/advanced-nutrition";
import { RecordScan } from "@/components/record-scan";
import { ManufacturingInfo } from "@/components/manufacturing-info";
import { ProductFeedback } from "@/components/product-feedback";
import { AdminProductActions } from "@/components/admin-product-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit, Info, AlertTriangle, Barcode } from "lucide-react";
import { checkIsFavorite } from "@/app/[locale]/product/actions";
import { FavoriteButton } from "@/components/favorite-button";
import { DietaryTags } from "@/components/dietary-tags";
import { BetterAlternatives } from "@/components/better-alternatives";
import { CompareButton } from "@/components/compare-button";

interface ProductPageProps {
    params: Promise<{ barcode: string }>;
}

export async function generateMetadata({
    params,
}: ProductPageProps): Promise<Metadata> {
    const { barcode, locale } = await params as unknown as { barcode: string; locale: string };
    const t = await getTranslations("Product");

    const dbProduct = await prisma.product.findUnique({
        where: { barcode },
    });

    if (dbProduct) {
        return constructMetadata({
            title: dbProduct.name,
            description: t("metaDescription", {
                name: dbProduct.name,
                brand: dbProduct.brand || t("unknownBrand"),
                letter: dbProduct.scoreLetter,
                score: dbProduct.score,
            }),
            locale,
            path: `/product/${barcode}`
        });
    }

    return constructMetadata({
        title: t("metaTitle", { barcode }),
        description: t("metaDescriptionFallback", { barcode }),
        locale,
        path: `/product/${barcode}`
    });
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { barcode } = await params;
    const session = await auth();
    const t = await getTranslations("Product");

    let product = await prisma.product.findUnique({
        where: { barcode },
    });

    if (product?.status === "PENDING" || product?.status === "REJECTED") {
        const isCreator = session?.user?.id === product.createdById;
        const isAdmin = session?.user?.role === "ADMIN";

        if (!isCreator && !isAdmin) {
            notFound();
        }
    }

    if (!product) {
        const offProduct = await fetchProductByBarcode(barcode);

        if (!offProduct) {
            notFound();
        }

        const scoreResult = calculateScore(offProduct);

        const productData = {
            barcode,
            name: getProductName(offProduct),
            brand: offProduct.brands || null,
            imageUrl: getProductImage(offProduct),
            offData: offProduct as object,
            score: scoreResult.score,
            scoreLetter: scoreResult.letter,
            scoreColor: scoreResult.color,
            positives: scoreResult.positives.map((p) => ({
                key: p.key,
                params: p.params,
                icon: p.icon,
            })),
            negatives: scoreResult.negatives.map((n) => ({
                key: n.key,
                params: n.params,
                icon: n.icon,
            })),
            allergens: scoreResult.allergens.map((a) => a.name),
            allergensSeverity: scoreResult.allergensSeverity,
            energy:
                offProduct.nutriments?.energy_kcal_100g ||
                offProduct.nutriments?.energy_100g,
            fat: offProduct.nutriments?.fat_100g,
            saturatedFat: offProduct.nutriments?.["saturated-fat_100g"],
            carbohydrates: offProduct.nutriments?.carbohydrates_100g,
            sugars: offProduct.nutriments?.sugars_100g,
            fiber: offProduct.nutriments?.fiber_100g,
            proteins: offProduct.nutriments?.proteins_100g,
            salt: offProduct.nutriments?.salt_100g,
            manufacturingPlaces: offProduct.manufacturing_places || null,
            origins: offProduct.origins || null,
            dietaryTags: scoreResult.dietaryTags,
            status: "APPROVED" as const,
        };

        product = await prisma.product.upsert({
            where: { barcode },
            create: productData,
            update: productData,
        });
    }

    const positives = parseScoreAspects(product.positives);
    const negatives = parseScoreAspects(product.negatives);
    const allergens = product.allergens.map((name: string) => ({
        name,
        severity: product.allergensSeverity,
    }));
    const dietaryTags = product.dietaryTags || [];

    const offData = product.offData as Record<string, unknown> | null;
    const isPremiumOrAdmin = true;
    const isAdmin = session?.user?.role === "ADMIN";

    const isFavorite = session?.user?.id ? await checkIsFavorite(product.id) : false;

    let alternatives: any[] = [];
    if (offData) {
        const categories = offData.categories_tags as string[] | undefined;
        if (categories && categories.length > 0) {
            // Try up to 3 most specific categories if the first ones yield no better alternatives
            for (let i = categories.length - 1; i >= Math.max(0, categories.length - 3); i--) {
                const specificCategory = categories[i];
                const fetched = await fetchBetterAlternatives(specificCategory);
                const filtered = fetched.filter((a: any) => a.code !== barcode);
                
                if (filtered.length > 0) {
                    alternatives = filtered.slice(0, 4);
                    break;
                }
            }
        }
    }

    let matchingAllergens: string[] = [];
    if (session?.user?.id) {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { allergies: true },
        });
        if (dbUser?.allergies && dbUser.allergies.length > 0) {
            matchingAllergens = allergens.filter(a =>
                dbUser.allergies.some(ua => a.name.toLowerCase().includes(ua.toLowerCase()))
            ).map(a => a.name);
        }
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6">
            <Link
                href="/scan"
                className="animate-fade-in-up inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-5 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                {t("backToScanner")}
            </Link>

            {matchingAllergens.length > 0 && (
                <div className="animate-fade-in-up mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20 shadow-sm shadow-red-100/50 dark:shadow-red-950/50">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500 shrink-0" />
                    <div>
                        <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                            {t("allergenWarningTitle")}
                        </h3>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                            {t.rich("allergenWarningDesc", {
                                allergens: () => (
                                    <strong className="font-semibold">
                                        {matchingAllergens.join(", ")}
                                    </strong>
                                ),
                            })}
                        </p>
                    </div>
                </div>
            )}

            <Card className="animate-fade-in-up relative overflow-hidden border-0 shadow-xl shadow-neutral-200/60 dark:shadow-neutral-950/40 bg-gradient-to-br from-white via-white to-orange-50/40 dark:from-neutral-900 dark:via-neutral-900 dark:to-orange-950/20">
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    <CompareButton barcode={product.barcode} size="icon" showLabel={false} className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm border-neutral-200/50 dark:bg-neutral-900/80 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-900" />
                    {session?.user?.id && (
                        <FavoriteButton productId={product.id} initialIsFavorite={isFavorite} />
                    )}
                </div>
                <CardContent className="p-0">
                    {product.status === "PENDING" && (
                        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            {t("pendingApproval")}
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-5 p-6">
                        <div className="relative h-36 w-36 shrink-0 self-center md:self-auto overflow-hidden rounded-2xl bg-white/70 dark:bg-neutral-800/60 backdrop-blur-sm ring-1 ring-neutral-100 dark:ring-neutral-700/50 shadow-md">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-contain p-3"
                                    sizes="144px"
                                    priority
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-5xl">
                                    📦
                                </div>
                            )}
                        </div>

                        <div className="flex flex-1 min-w-0 flex-col justify-center">
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
                                {product.name}
                            </h1>
                            {product.brand && (
                                <p className="mt-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                    {product.brand}
                                </p>
                            )}
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md w-fit">
                                <Barcode className="w-3.5 h-3.5 mr-1 text-neutral-400 dark:text-neutral-500" /> {product.barcode}
                            </div>
                            {dietaryTags.length > 0 && (
                                <DietaryTags tags={dietaryTags} />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center border-t border-neutral-100/80 bg-gradient-to-b from-neutral-50/60 to-neutral-100/40 py-7 dark:border-neutral-800 dark:from-neutral-900/60 dark:to-neutral-800/30">
                        <ScoreBadge
                            score={product.score}
                            letter={product.scoreLetter as "A" | "B" | "C" | "D" | "E"}
                            color={product.scoreColor}
                            size="lg"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="mt-5 animate-fade-in-up delay-100 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4">
                <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t("scoresInfoTitle")}</h4>
                        <div className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed space-y-1.5">
                            <p><strong>{t("scoreProductTitle")}</strong> {t("scoreProductDesc")}</p>
                            <p><strong>{t("scoreLetterTitle")}</strong> {t("scoreLetterDesc")}</p>
                            <p><strong>{t("scoreNutriTitle")}</strong> {t("scoreNutriDesc")}</p>
                            <p><strong>{t("scoreEcoTitle")}</strong> {t("scoreEcoDesc")}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-7 space-y-5">
                <Card className="animate-fade-in-up delay-500 border-0 shadow-md overflow-hidden">
                    <div className="flex">
                        <div className="w-1 bg-gradient-to-b from-blue-400 to-blue-600 shrink-0" />
                        <CardContent className="p-4 flex-1">
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
                    </div>
                </Card>
                {positives.length > 0 && (
                    <Card className="animate-fade-in-up delay-100 border-0 shadow-md shadow-emerald-100/30 dark:shadow-emerald-950/20 overflow-hidden">
                        <div className="flex">
                            <div className="w-1 bg-gradient-to-b from-emerald-400 to-emerald-600 shrink-0" />
                            <CardContent className="p-4 flex-1">
                                <PositivesList items={positives} />
                            </CardContent>
                        </div>
                    </Card>
                )}

                {negatives.length > 0 && (
                    <Card className="animate-fade-in-up delay-200 border-0 shadow-md shadow-red-100/30 dark:shadow-red-950/20 overflow-hidden">
                        <div className="flex">
                            <div className="w-1 bg-gradient-to-b from-red-400 to-red-600 shrink-0" />
                            <CardContent className="p-4 flex-1">
                                <NegativesList items={negatives} />
                            </CardContent>
                        </div>
                    </Card>
                )}

                <Card className="animate-fade-in-up delay-300 border-0 shadow-md shadow-amber-100/20 dark:shadow-amber-950/20 overflow-hidden">
                    <div className="flex">
                        <div className="w-1 bg-gradient-to-b from-amber-400 to-amber-600 shrink-0" />
                        <CardContent className="p-4 flex-1">
                            <AllergenTags
                                allergens={allergens}
                                overallSeverity={product.allergensSeverity}
                            />
                        </CardContent>
                    </div>
                </Card>

                {(product.manufacturingPlaces || product.origins) && (
                    <Card className="animate-fade-in-up delay-300 border-0 shadow-md overflow-hidden">
                        <div className="flex">
                            <div className="w-1 bg-gradient-to-b from-orange-400 to-orange-600 shrink-0" />
                            <CardContent className="p-4 flex-1">
                                <ManufacturingInfo
                                    manufacturingPlaces={product.manufacturingPlaces}
                                    origins={product.origins}
                                />
                            </CardContent>
                        </div>
                    </Card>
                )}

                {offData && (
                    <div className="animate-fade-in-up delay-400">
                        <ProductBasicDetails
                            countries={offData.countries_tags as string[] | undefined}
                            stores={(offData.stores_tags as string[] | undefined) || (offData.stores ? [offData.stores as string] : [])}
                        />
                    </div>
                )}

                {isPremiumOrAdmin && offData && (
                    <div className="animate-fade-in-up delay-400">
                        <AdvancedNutrition
                            nutritionGradeFr={offData.nutrition_grade_fr as string | undefined}
                            novaGroup={offData.nova_group as number | undefined}
                            ecoscoreScore={offData.ecoscore_score as number | undefined}
                            ecoscoreGrade={offData.ecoscore_grade as string | undefined}
                            nutrimentLevels={offData.nutriment_levels}
                            nutriscoreData={offData.nutriscore_data}
                            ecoscoreData={offData.ecoscore_data}
                        />
                    </div>
                )}
            </div>

            {alternatives.length > 0 && (
                <BetterAlternatives alternatives={alternatives} />
            )}

            <div className="mt-7 animate-fade-in-up delay-500">
                <ProductFeedback
                    barcode={product.barcode}
                    userRole={session?.user?.role}
                    userId={session?.user?.id}
                />
            </div>

            {isAdmin && (
                <div className="mt-7 animate-fade-in-up delay-[550ms]">
                    <AdminProductActions
                        productId={product.id}
                        currentStatus={product.status}
                    />
                </div>
            )}

            {session?.user?.id && (
                <div className="mt-7 flex flex-wrap gap-3 animate-fade-in-up delay-600">
                    <Link href={`/add-product?barcode=${barcode}&edit=true`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2 h-11 rounded-xl border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                            <Edit className="h-4 w-4" />
                            {t("suggestEdit")}
                        </Button>
                    </Link>
                </div>
            )}

            <RecordScan barcode={product.barcode} userId={session?.user?.id} />
        </div>
    );
}
