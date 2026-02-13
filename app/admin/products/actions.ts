"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ProductActionResult {
    success: boolean;
    error?: string;
}

export async function approveProduct(productId: string): Promise<ProductActionResult> {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.product.update({
            where: { id: productId },
            data: {
                status: "APPROVED",
                approvedAt: new Date(),
            },
        });

        revalidatePath("/admin/products");
        revalidatePath(`/product/${productId}`);
        return { success: true };
    } catch (error) {
        console.error("Error approving product:", error);
        return { success: false, error: "Failed to approve product" };
    }
}

export async function rejectProduct(productId: string): Promise<ProductActionResult> {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.product.update({
            where: { id: productId },
            data: {
                status: "REJECTED",
            },
        });

        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Error rejecting product:", error);
        return { success: false, error: "Failed to reject product" };
    }
}

export async function deleteProduct(productId: string): Promise<ProductActionResult> {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.product.delete({
            where: { id: productId },
        });

        revalidatePath("/admin/products");
        return { success: true };
    } catch (error) {
        console.error("Error deleting product:", error);
        return { success: false, error: "Failed to delete product" };
    }
}
