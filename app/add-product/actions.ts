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
                allergens: [],
                allergensSeverity: "LOW",
                energy: data.energy || null,
                fat: data.fat || null,
                saturatedFat: data.saturatedFat || null,
                carbohydrates: data.carbohydrates || null,
                sugars: data.sugars || null,
                fiber: data.fiber || null,
                proteins: data.proteins || null,
                salt: data.salt || null,
                status: "DRAFT",
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
