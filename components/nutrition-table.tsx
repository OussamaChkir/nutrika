import { getTranslations } from "next-intl/server";
import { formatNutrition } from "@/lib/utils";

interface NutritionData {
    energy?: number | null;
    fat?: number | null;
    saturatedFat?: number | null;
    carbohydrates?: number | null;
    sugars?: number | null;
    fiber?: number | null;
    proteins?: number | null;
    salt?: number | null;
}

interface NutritionTableProps {
    nutrition: NutritionData;
}

export async function NutritionTable({ nutrition }: NutritionTableProps) {
    const t = await getTranslations("Product");

    const items = [
        { label: t("nutritionEnergy"), value: nutrition.energy, unit: "kcal" },
        { label: t("nutritionFat"), value: nutrition.fat, unit: "g" },
        { label: t("nutritionSaturatedFat"), value: nutrition.saturatedFat, unit: "g", indent: true },
        { label: t("nutritionCarbohydrates"), value: nutrition.carbohydrates, unit: "g" },
        { label: t("nutritionSugars"), value: nutrition.sugars, unit: "g", indent: true },
        { label: t("nutritionFiber"), value: nutrition.fiber, unit: "g" },
        { label: t("nutritionProteins"), value: nutrition.proteins, unit: "g" },
        { label: t("nutritionSalt"), value: nutrition.salt, unit: "g" },
    ];

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {t("nutritionTitle")}
            </h3>
            <div className="rounded-xl border border-neutral-200 bg-white/50 dark:border-neutral-700 dark:bg-neutral-800/50 overflow-hidden">
                <table className="w-full text-sm">
                    <tbody>
                        {items.map((item, index) => (
                            <tr
                                key={item.label}
                                className={
                                    index !== items.length - 1
                                        ? "border-b border-neutral-100 dark:border-neutral-700/50"
                                        : ""
                                }
                            >
                                <td
                                    className={`py-2.5 px-4 text-neutral-600 dark:text-neutral-400 ${item.indent ? "pl-8" : ""
                                        }`}
                                >
                                    {item.indent && (
                                        <span className="mr-1 text-neutral-300 dark:text-neutral-600">└</span>
                                    )}
                                    {item.label}
                                </td>
                                <td className="py-2.5 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100">
                                    {formatNutrition(item.value, item.unit)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
