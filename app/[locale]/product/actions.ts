"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function checkIsFavorite(productId: string): Promise<boolean> {
    try {
        const session = await auth();
        if (!session?.user?.id) return false;

        const favorite = await prisma.favorite.findUnique({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId,
                },
            },
        });

        return !!favorite;
    } catch (error) {
        console.error("Error checking favorite status:", error);
        return false;
    }
}

export async function toggleFavorite(productId: string, pathname: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "You must be logged in to favorite products." };
        }

        const userId = session.user.id;

        const existing = await prisma.favorite.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId,
                },
            },
        });

        if (existing) {
            await prisma.favorite.delete({
                where: {
                    id: existing.id,
                },
            });
        } else {
            await prisma.favorite.create({
                data: {
                    userId,
                    productId,
                },
            });
        }

        // Revalidate the product page so the UI updates if necessary
        revalidatePath(pathname);
        return { success: true, isFavorite: !existing };
    } catch (error) {
        console.error("Error toggling favorite:", error);
        return { error: "Failed to update favorite status." };
    }
}
