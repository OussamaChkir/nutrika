import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/product-card";
import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export const metadata: Metadata = {
    title: "My Favorites | Nutrika",
    description: "View your favorite products",
};

export default async function FavoritesPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/sign-in");
    }

    const t = await getTranslations('Header');

    const favorites = await prisma.favorite.findMany({
        where: { userId: session.user.id },
        include: { product: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                    <Heart className="h-6 w-6 fill-current" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                        {t('favorites')}
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Products you have saved for later.
                    </p>
                </div>
            </div>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 py-24 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
                    <Heart className="mb-4 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
                    <h2 className="mb-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                        No favorites yet
                    </h2>
                    <p className="mb-6 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                        You haven't added any products to your favorites. Scan some products and tap the heart icon to save them here!
                    </p>
                    <div className="flex gap-4">
                        <Link href="/scan">
                            <Button className="gap-2 bg-gradient-to-r from-orange-500 to-orangina-400 text-white hover:from-orange-600 hover:to-orangina-500">
                                <Search className="h-4 w-4" />
                                Scan a Product
                            </Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {favorites.map((favorite) => (
                        <ProductCard
                            key={favorite.product.id}
                            barcode={favorite.product.barcode}
                            name={favorite.product.name}
                            brand={favorite.product.brand}
                            imageUrl={favorite.product.imageUrl}
                            score={favorite.product.score}
                            scoreLetter={favorite.product.scoreLetter}
                            scoreColor={favorite.product.scoreColor}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
