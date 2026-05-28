"use client";

import { useCompare } from "./compare-context";
import { Button } from "@/components/ui/button";
import { Scale, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface CompareButtonProps {
    barcode: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    showLabel?: boolean;
}

export function CompareButton({ 
    barcode, 
    variant = "outline", 
    size = "sm", 
    className = "",
    showLabel = true 
}: CompareButtonProps) {
    const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare();
    const isAdded = isInCompare(barcode);
    const t = useTranslations("Compare");

    const toggleCompare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isAdded) {
            removeFromCompare(barcode);
        } else {
            // Check if we are at max limit before adding, though context limits it to 4.
            // We could show a toast here if at limit.
            addToCompare(barcode);
        }
    };

    return (
        <Button
            variant={isAdded ? "secondary" : variant}
            size={size}
            onClick={toggleCompare}
            className={`gap-2 transition-all ${
                isAdded 
                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-900/60" 
                    : ""
            } ${className}`}
            title={isAdded ? t("removeFromCompare") : t("addToCompare")}
        >
            {isAdded ? (
                <Check className={size === "icon" ? "h-5 w-5" : "h-4 w-4"} />
            ) : (
                <Scale className={size === "icon" ? "h-5 w-5" : "h-4 w-4"} />
            )}
            {showLabel && (
                <span className="hidden sm:inline">
                    {isAdded ? t("inCompare") : t("compare")}
                </span>
            )}
        </Button>
    );
}
