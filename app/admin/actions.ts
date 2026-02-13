"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface AdminActionResult {
    success: boolean;
    error?: string;
}

export async function approveContribution(
    contributionId: string
): Promise<AdminActionResult> {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const contribution = await prisma.contribution.findUnique({
            where: { id: contributionId },
            include: { product: true },
        });

        if (!contribution) {
            return { success: false, error: "Contribution not found" };
        }

        const changes = contribution.changes as Record<string, unknown>;

        // Apply changes to the product
        await prisma.$transaction([
            prisma.product.update({
                where: { id: contribution.productId },
                data: {
                    name: (changes.name as string) || contribution.product.name,
                    brand: (changes.brand as string) || contribution.product.brand,
                    imageUrl: (changes.imageUrl as string) || contribution.product.imageUrl,
                    energy: (changes.energy as number) ?? contribution.product.energy,
                    fat: (changes.fat as number) ?? contribution.product.fat,
                    saturatedFat: (changes.saturatedFat as number) ?? contribution.product.saturatedFat,
                    carbohydrates: (changes.carbohydrates as number) ?? contribution.product.carbohydrates,
                    sugars: (changes.sugars as number) ?? contribution.product.sugars,
                    fiber: (changes.fiber as number) ?? contribution.product.fiber,
                    proteins: (changes.proteins as number) ?? contribution.product.proteins,
                    salt: (changes.salt as number) ?? contribution.product.salt,
                    status: "APPROVED",
                    approvedAt: new Date(),
                },
            }),
            prisma.contribution.update({
                where: { id: contributionId },
                data: {
                    status: "APPROVED",
                    reviewedById: session.user.id,
                    reviewedAt: new Date(),
                },
            }),
        ]);

        revalidatePath("/admin/contributions");
        revalidatePath(`/product/${contribution.product.barcode}`);

        return { success: true };
    } catch (error) {
        console.error("Error approving contribution:", error);
        return { success: false, error: "Failed to approve contribution" };
    }
}

export async function rejectContribution(
    contributionId: string,
    reviewNote?: string
): Promise<AdminActionResult> {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.contribution.update({
            where: { id: contributionId },
            data: {
                status: "REJECTED",
                reviewedById: session.user.id,
                reviewedAt: new Date(),
                reviewNote: reviewNote || null,
            },
        });

        revalidatePath("/admin/contributions");

        return { success: true };
    } catch (error) {
        console.error("Error rejecting contribution:", error);
        return { success: false, error: "Failed to reject contribution" };
    }
}

export async function promoteUser(
    userId: string,
    role: "USER" | "ADMIN" | "PREMIUM"
): Promise<AdminActionResult> {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        revalidatePath("/admin");

        return { success: true };
    } catch (error) {
        console.error("Error promoting user:", error);
        return { success: false, error: "Failed to update user role" };
    }
}
