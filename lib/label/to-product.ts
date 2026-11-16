// F5: the reviewed form as a normalized Product, so scoreProduct and evaluateProduct are reused
// unchanged. Pure.
//
// Allergen declarations are appended to the ingredient text in the form the allergen engine
// already understands ("May contain: ..."), so contains / may contain / unknown follow the same
// rules as barcode products. If the list is not marked complete, the product is flagged
// "ingredients to be completed", which makes the allergen state "unknown", never green.

import type { OFFProduct } from "../openfoodfacts";
import { normalizeOffProduct, type Product } from "../product";
import type { LabelForm, LabelKind } from "./schema";

/** Barcode used for products made from a photo. They are never saved, only scored. */
export const PHOTO_BARCODE = "photo-scan";

const CATEGORY_TAGS: Record<LabelKind, string[]> = {
    food: [],
    drink: ["en:beverages"],
    cheese: ["en:dairies", "en:cheeses"],
    oil_fat: ["en:fats", "en:vegetable-oils"],
};

const nutriment = (v: number | null) => (v === null ? undefined : v);

/** Ingredient text plus the declared allergens, in a shape the allergen engine reads. */
export function composeIngredientsText(form: LabelForm): string {
    const parts: string[] = [];
    if (form.ingredientsText.trim()) parts.push(form.ingredientsText.trim().replace(/[.;]+$/u, ""));
    if (form.allergensContains.length > 0) parts.push(`Contains: ${form.allergensContains.join(", ")}`);
    if (form.allergensMayContain.length > 0) parts.push(`May contain traces of: ${form.allergensMayContain.join(", ")}`);
    return parts.join(". ") + (parts.length > 0 ? "." : "");
}

export function labelToProduct(form: LabelForm): Product {
    const n = form.nutrition;
    const text = composeIngredientsText(form);
    const off: OFFProduct = {
        code: PHOTO_BARCODE,
        product_name: form.productName || "Photo scan",
        brands: form.brand || undefined,
        ingredients_text: form.ingredientsText.trim() ? text : "",
        categories_tags: CATEGORY_TAGS[form.kind],
        states_tags: form.ingredientsComplete ? [] : ["en:ingredients-to-be-completed"],
        nutriments: {
            energy_kcal_100g: nutriment(n.energyKcal),
            fat_100g: nutriment(n.fat),
            "saturated-fat_100g": nutriment(n.saturatedFat),
            carbohydrates_100g: nutriment(n.carbohydrates),
            sugars_100g: nutriment(n.sugars),
            fiber_100g: nutriment(n.fiber),
            proteins_100g: nutriment(n.proteins),
            salt_100g: nutriment(n.salt),
        },
    };
    const product = normalizeOffProduct(off);
    // Declared allergens count even when the free-text list is empty (e.g. only an allergen box was photographed).
    if (!form.ingredientsText.trim() && (form.allergensContains.length > 0 || form.allergensMayContain.length > 0)) {
        // The status stays "missing": an allergen box is not an ingredient list, so absence proves nothing.
        return { ...product, ingredientsText: text };
    }
    return product;
}
