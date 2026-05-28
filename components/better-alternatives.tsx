import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/product-card";
import { OFFProduct } from "@/lib/openfoodfacts";
import { calculateScore } from "@/lib/scoring";
import { getProductName, getProductImage } from "@/lib/openfoodfacts";
import { Sparkles } from "lucide-react";

interface BetterAlternativesProps {
    alternatives: OFFProduct[];
}

export async function BetterAlternatives({ alternatives }: BetterAlternativesProps) {
    const t = await getTranslations("Product");

    if (!alternatives || alternatives.length === 0) {
        return null;
    }

    return (
        <div className="mt-7 space-y-4 animate-fade-in-up delay-[450ms]">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {t("betterAlternatives") || "Better Alternatives"}
                </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {alternatives.map((offProduct) => {
                    const scoreResult = calculateScore(offProduct);
                    return (
                        <ProductCard
                            key={offProduct.code}
                            barcode={offProduct.code}
                            name={getProductName(offProduct)}
                            brand={offProduct.brands || null}
                            imageUrl={getProductImage(offProduct)}
                            score={scoreResult.score}
                            scoreLetter={scoreLetterFromGrade(offProduct.nutriscore_grade, scoreResult.letter)}
                            scoreColor={scoreResult.color}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function scoreLetterFromGrade(grade: string | undefined, calculatedLetter: string): "A" | "B" | "C" | "D" | "E" {
    if (grade && /^[a-e]$/i.test(grade)) {
        return grade.toUpperCase() as "A" | "B" | "C" | "D" | "E";
    }
    return calculatedLetter as "A" | "B" | "C" | "D" | "E";
}
