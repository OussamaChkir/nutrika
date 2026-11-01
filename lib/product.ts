// Normalized product model.
//
// Open Food Facts (OFF) fields are mapped ONCE here and the rest of the app
// (scoring, rules, offline mode, ...) works with `Product`, never with raw OFF data.
// This file must stay free of I/O and of server-only imports so it can run on the
// server, in the browser and offline.

import type { OFFProduct } from "./openfoodfacts";

// ============================================
// TYPES
// ============================================

export type NutriscoreGrade = "a" | "b" | "c" | "d" | "e";

/** Nutrient values per 100 g (per 100 ml for drinks). `undefined` means "unknown". */
export interface ProductNutrients {
    energyKcal?: number;
    energyKj?: number;
    fat?: number;
    saturatedFat?: number;
    carbohydrates?: number;
    sugars?: number;
    fiber?: number;
    proteins?: number;
    salt?: number;
    sodium?: number;
}

export interface ProductLabels {
    organic: boolean;
    fairTrade: boolean;
    vegan: boolean;
    vegetarian: boolean;
}

export interface Product {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    nutrients: ProductNutrients;
    /** NOVA processing group, 1 to 4, when known. */
    novaGroup?: number;
    /** Official Nutri-Score grade. Only a-e: "unknown" / "not-applicable" become undefined. */
    nutriscoreGrade?: NutriscoreGrade;
    ecoscoreGrade?: string;
    /** Additive codes in upper case, e.g. "E102", "E150D". */
    additives: string[];
    /** Allergens declared by the manufacturer, lower-case names such as "peanuts", "tree nuts". */
    allergens: string[];
    /** "May contain" traces, same format as `allergens`. */
    traces: string[];
    labels: ProductLabels;
    /** OFF category tags, most generic first, e.g. "en:beverages". */
    categoryTags: string[];
    ingredientsText?: string;
    ingredientsAnalysisTags: string[];
}

// ============================================
// OFF HELPERS (pure)
// ============================================

function tagToName(tag: string): string {
    return tag.replace(/^en:/, "").replace(/-/g, " ");
}

/** Allergen names from OFF `allergens_tags`. */
export function parseAllergenTags(product: OFFProduct): string[] {
    return Array.from(new Set((product.allergens_tags ?? []).map(tagToName)));
}

/** "May contain" names from OFF `traces_tags`. */
export function parseTraceTags(product: OFFProduct): string[] {
    return Array.from(new Set((product.traces_tags ?? []).map(tagToName)));
}

/**
 * Allergens followed by traces ("may contain x"), de-duplicated.
 * Kept for the existing OFF-based callers.
 */
export function parseAllergens(product: OFFProduct): string[] {
    const names = new Set<string>(parseAllergenTags(product));
    parseTraceTags(product).forEach((name) => names.add(`may contain ${name}`));
    return Array.from(names);
}

/** Additive codes from OFF data, upper case. */
export function parseAdditives(product: OFFProduct): string[] {
    if (!product.additives_tags) return [];
    return product.additives_tags.map((tag) => tag.replace(/^en:/, "").toUpperCase());
}

/** True when any OFF label tag contains the keyword. */
export function hasLabel(product: OFFProduct, labelKeyword: string): boolean {
    if (!product.labels_tags) return false;
    const keyword = labelKeyword.toLowerCase();
    return product.labels_tags.some((tag) => tag.toLowerCase().includes(keyword));
}

export function getProductName(product: OFFProduct): string {
    return product.product_name || product.product_name_en || "Unknown Product";
}

export function getProductImage(product: OFFProduct): string | null {
    return product.image_front_url || product.image_url || product.image_front_small_url || null;
}

function parseNutriscoreGrade(grade: string | undefined): NutriscoreGrade | undefined {
    const value = grade?.trim().toLowerCase();
    return value && /^[a-e]$/.test(value) ? (value as NutriscoreGrade) : undefined;
}

// ============================================
// NORMALIZATION
// ============================================

/** Map a raw Open Food Facts product to the normalized `Product`. */
export function normalizeOffProduct(off: OFFProduct): Product {
    const n = off.nutriments ?? {};
    return {
        barcode: off.code,
        name: getProductName(off),
        brand: off.brands || null,
        imageUrl: getProductImage(off),
        nutrients: {
            energyKcal: n.energy_kcal_100g,
            energyKj: n.energy_100g,
            fat: n.fat_100g,
            saturatedFat: n["saturated-fat_100g"],
            carbohydrates: n.carbohydrates_100g,
            sugars: n.sugars_100g,
            fiber: n.fiber_100g,
            proteins: n.proteins_100g,
            salt: n.salt_100g,
            sodium: n.sodium_100g,
        },
        novaGroup: off.nova_group,
        nutriscoreGrade: parseNutriscoreGrade(off.nutriscore_grade),
        ecoscoreGrade: off.ecoscore_grade,
        additives: parseAdditives(off),
        allergens: parseAllergenTags(off),
        traces: parseTraceTags(off),
        labels: {
            organic: hasLabel(off, "organic") || hasLabel(off, "bio"),
            fairTrade: hasLabel(off, "fair-trade"),
            vegan: hasLabel(off, "vegan"),
            vegetarian: hasLabel(off, "vegetarian"),
        },
        categoryTags: off.categories_tags ?? [],
        ingredientsText: off.ingredients_text,
        ingredientsAnalysisTags: off.ingredients_analysis_tags ?? [],
    };
}
