"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleFavorite } from "@/app/[locale]/product/actions";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
    productId: string;
    initialIsFavorite: boolean;
}

export function FavoriteButton({ productId, initialIsFavorite }: FavoriteButtonProps) {
    const t = useTranslations("Product");
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [isPending, startTransition] = useTransition();
    const pathname = usePathname();

    const handleToggle = () => {
        setIsFavorite(!isFavorite);

        startTransition(async () => {
            const result = await toggleFavorite(productId, pathname);
            if (result.error) {
                setIsFavorite(isFavorite);
            }
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={cn(
                "flex items-center justify-center rounded-full p-2.5 transition-all duration-300",
                "bg-white/70 dark:bg-neutral-800/60 backdrop-blur-sm shadow-sm ring-1 ring-neutral-200/50 dark:ring-neutral-700/50",
                "hover:bg-red-50 hover:ring-red-200 dark:hover:bg-red-950/30 dark:hover:ring-red-900/50 hover:scale-105 active:scale-95 disabled:opacity-50",
                isFavorite && "bg-red-50 dark:bg-red-950/20 ring-red-200 dark:ring-red-900/50 shadow-red-100/50 dark:shadow-red-950/30"
            )}
            title={isFavorite ? t("favoriteRemove") : t("favoriteAdd")}
        >
            <Heart
                className={cn(
                    "h-5 w-5 transition-colors duration-300",
                    isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-neutral-500 dark:text-neutral-400 group-hover:text-red-400"
                )}
            />
        </button>
    );
}
