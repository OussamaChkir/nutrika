// Load a product for display: from our catalogue, or (first scan) from Open Food Facts, scored and saved.
// Shared by the product page and the mobile API (GET /api/v1/products/{barcode}).

import type { Product } from "@prisma/client";

import { prisma } from "../db";
import { fetchProductByBarcode, getProductImage, getProductName } from "../openfoodfacts";
import { calculateScore } from "../scoring";

export interface Viewer {
    userId?: string | null;
    isAdmin?: boolean;
}

/**
 * Returns the catalogue product, creating it from Open Food Facts the first time it is seen.
 * A product that is waiting for review (or was rejected) is only visible to the person who added it
 * and to admins. Returns null when nobody knows the barcode.
 */
export async function loadCatalogProduct(barcode: string, viewer: Viewer): Promise<Product | null> {
    const existing = await prisma.product.findUnique({ where: { barcode } });

    if (existing?.status === "PENDING" || existing?.status === "REJECTED") {
        const isCreator = !!viewer.userId && viewer.userId === existing.createdById;
        if (!isCreator && !viewer.isAdmin) return null;
    }
    if (existing) return existing;

    const offProduct = await fetchProductByBarcode(barcode);
    if (!offProduct) return null;

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
        energy: offProduct.nutriments?.energy_kcal_100g || offProduct.nutriments?.energy_100g,
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

    return prisma.product.upsert({
        where: { barcode },
        create: productData,
        update: productData,
    });
}
