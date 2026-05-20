"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { productFormSchema, ProductFormInput } from "@/lib/validators";
import { redirect } from "next/navigation";

export interface ProductActionResult {
    success: boolean;
    error?: string;
    productId?: string;
}

export interface ProductEditData {
    barcode: string;
    name: string;
    brand?: string | null;
    imageUrl?: string | null;
    energy?: number | null;
    fat?: number | null;
    saturatedFat?: number | null;
    carbohydrates?: number | null;
    sugars?: number | null;
    fiber?: number | null;
    proteins?: number | null;
    salt?: number | null;
    allergens?: string[];
    allergensSeverity?: string;
    manufacturingPlaces?: string | null;
    origins?: string | null;
    dietaryTags?: string[];
}

export async function getProductForEdit(barcode: string): Promise<ProductEditData | null> {
    try {
        const product = await prisma.product.findUnique({
            where: { barcode },
        });

        if (!product) return null;

        return {
            barcode: product.barcode,
            name: product.name,
            brand: product.brand,
            imageUrl: product.imageUrl,
            energy: product.energy,
            fat: product.fat,
            saturatedFat: product.saturatedFat,
            carbohydrates: product.carbohydrates,
            sugars: product.sugars,
            fiber: product.fiber,
            proteins: product.proteins,
            salt: product.salt,
            allergens: product.allergens,
            allergensSeverity: product.allergensSeverity,
            manufacturingPlaces: product.manufacturingPlaces,
            origins: product.origins,
            dietaryTags: product.dietaryTags,
        };
    } catch (error) {
        console.error("Error fetching product for edit:", error);
        return null;
    }
}

export async function createProductAction(
    data: ProductFormInput
): Promise<ProductActionResult> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: "You must be logged in to add products" };
    }

    const validatedFields = productFormSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            success: false,
            error: validatedFields.error.errors[0]?.message || "Invalid input",
        };
    }

    // Parse comma-separated fields into arrays
    const allergensArray = data.allergens
        ? data.allergens.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    const dietaryTagsArray = data.dietaryTags
        ? data.dietaryTags.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    try {
        // Check if product already exists
        const existingProduct = await prisma.product.findUnique({
            where: { barcode: data.barcode },
        });

        if (existingProduct) {
            // Create a contribution (edit suggestion) instead
            await prisma.contribution.create({
                data: {
                    productId: existingProduct.id,
                    userId: session.user.id,
                    changes: {
                        name: data.name,
                        brand: data.brand,
                        imageUrl: data.imageUrl,
                        energy: data.energy,
                        fat: data.fat,
                        saturatedFat: data.saturatedFat,
                        carbohydrates: data.carbohydrates,
                        sugars: data.sugars,
                        fiber: data.fiber,
                        proteins: data.proteins,
                        salt: data.salt,
                        allergens: allergensArray,
                        allergensSeverity: data.allergensSeverity,
                        manufacturingPlaces: data.manufacturingPlaces,
                        origins: data.origins,
                        dietaryTags: dietaryTagsArray,
                    },
                    reason: "User submitted product update",
                    status: "PENDING",
                },
            });

            return {
                success: true,
                productId: existingProduct.id,
            };
        }

        // Create new product as draft
        const product = await prisma.product.create({
            data: {
                barcode: data.barcode,
                name: data.name,
                brand: data.brand || null,
                imageUrl: data.imageUrl || null,
                score: 50, // Default score until analyzed
                scoreLetter: "C",
                scoreColor: "#f97316",
                positives: [],
                negatives: [],
                allergens: allergensArray,
                allergensSeverity: data.allergensSeverity || "LOW",
                dietaryTags: dietaryTagsArray,
                energy: data.energy || null,
                fat: data.fat || null,
                saturatedFat: data.saturatedFat || null,
                carbohydrates: data.carbohydrates || null,
                sugars: data.sugars || null,
                fiber: data.fiber || null,
                proteins: data.proteins || null,
                salt: data.salt || null,
                manufacturingPlaces: data.manufacturingPlaces || null,
                origins: data.origins || null,
                status: "PENDING",
                createdById: session.user.id,
            },
        });

        return {
            success: true,
            productId: product.id,
        };
    } catch (error) {
        console.error("Error creating product:", error);
        return {
            success: false,
            error: "Failed to create product. Please try again.",
        };
    }
}
