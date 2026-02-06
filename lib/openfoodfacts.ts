import { cache } from "react";

// ============================================
// TYPES
// ============================================

export interface OFFNutriments {
    energy_100g?: number;
    energy_kcal_100g?: number;
    fat_100g?: number;
    "saturated-fat_100g"?: number;
    carbohydrates_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    proteins_100g?: number;
    salt_100g?: number;
    sodium_100g?: number;
}

export interface OFFProduct {
    code: string;
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    nutriments?: OFFNutriments;
    ingredients_text?: string;
    ingredients_text_en?: string;
    allergens?: string;
    allergens_tags?: string[];
    traces_tags?: string[];
    additives_tags?: string[];
    nova_group?: number;
    nutriscore_grade?: string;
    nutriscore_score?: number;
    ecoscore_grade?: string;
    categories?: string;
    categories_tags?: string[];
    labels?: string;
    labels_tags?: string[];
    quantity?: string;
    serving_size?: string;
    countries_tags?: string[];
}

export interface OFFResponse {
    code: string;
    product?: OFFProduct;
    status: number;
    status_verbose: string;
}

export interface OFFSearchResponse {
    count: number;
    page: number;
    page_count: number;
    page_size: number;
    products: OFFProduct[];
}

// ============================================
// API FUNCTIONS
// ============================================

const OFF_BASE_URL = "https://world.openfoodfacts.org/api/v2";
const OFF_USER_AGENT = "Nutrika/1.0 (contact@nutrika.app)";

/**
 * Fetch a product from Open Food Facts by barcode
 * Uses React cache for request deduplication
 */
export const fetchProductByBarcode = cache(
    async (barcode: string): Promise<OFFProduct | null> => {
        try {
            const response = await fetch(
                `${OFF_BASE_URL}/product/${barcode}.json`,
                {
                    headers: {
                        "User-Agent": OFF_USER_AGENT,
                    },
                    next: {
                        revalidate: 3600, // Cache for 1 hour
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`OFF API error: ${response.status}`);
            }

            const data: OFFResponse = await response.json();

            if (data.status !== 1 || !data.product) {
                return null;
            }

            return data.product;
        } catch (error) {
            console.error("Error fetching product from OFF:", error);
            return null;
        }
    }
);

/**
 * Search products on Open Food Facts
 */
export async function searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 20
): Promise<OFFSearchResponse | null> {
    try {
        const params = new URLSearchParams({
            search_terms: query,
            page: page.toString(),
            page_size: pageSize.toString(),
            json: "1",
        });

        const response = await fetch(
            `${OFF_BASE_URL}/search?${params.toString()}`,
            {
                headers: {
                    "User-Agent": OFF_USER_AGENT,
                },
                next: {
                    revalidate: 300, // Cache for 5 minutes
                },
            }
        );

        if (!response.ok) {
            throw new Error(`OFF API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error searching products on OFF:", error);
        return null;
    }
}

/**
 * Get the best available product name
 */
export function getProductName(product: OFFProduct): string {
    return (
        product.product_name ||
        product.product_name_en ||
        "Unknown Product"
    );
}

/**
 * Get the best available image URL
 */
export function getProductImage(product: OFFProduct): string | null {
    return (
        product.image_front_url ||
        product.image_url ||
        product.image_front_small_url ||
        null
    );
}

/**
 * Parse allergens from OFF data
 */
export function parseAllergens(product: OFFProduct): string[] {
    const allergens: Set<string> = new Set();

    // From allergens_tags
    if (product.allergens_tags) {
        product.allergens_tags.forEach((tag) => {
            const name = tag.replace(/^en:/, "").replace(/-/g, " ");
            allergens.add(name);
        });
    }

    // From traces_tags (may contain)
    if (product.traces_tags) {
        product.traces_tags.forEach((tag) => {
            const name = tag.replace(/^en:/, "").replace(/-/g, " ");
            allergens.add(`may contain ${name}`);
        });
    }

    return Array.from(allergens);
}

/**
 * Get additives from OFF data
 */
export function parseAdditives(product: OFFProduct): string[] {
    if (!product.additives_tags) return [];

    return product.additives_tags.map((tag) =>
        tag.replace(/^en:/, "").toUpperCase()
    );
}

/**
 * Check if product has specific labels
 */
export function hasLabel(product: OFFProduct, labelKeyword: string): boolean {
    if (!product.labels_tags) return false;
    return product.labels_tags.some((tag) =>
        tag.toLowerCase().includes(labelKeyword.toLowerCase())
    );
}
