import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { InlineScoreBadge } from "@/components/score-badge";
import { ChevronRight } from "lucide-react";

interface ProductCardProps {
    barcode: string;
    name: string;
    brand?: string | null;
    imageUrl?: string | null;
    score: number;
    scoreLetter: "A" | "B" | "C" | "D" | "E";
    scoreColor: string;
}

export function ProductCard({
    barcode,
    name,
    brand,
    imageUrl,
    score,
    scoreLetter,
    scoreColor,
}: ProductCardProps) {
    return (
        <Link href={`/product/${barcode}`}>
            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <CardContent className="flex items-center gap-4 p-4">
                    {/* Product image */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={name}
                                fill
                                className="object-contain p-1"
                                sizes="64px"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-400">
                                <span className="text-2xl">📦</span>
                            </div>
                        )}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {name}
                        </h3>
                        {brand && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                {brand}
                            </p>
                        )}
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                            {barcode}
                        </p>
                    </div>

                    {/* Score and arrow */}
                    <div className="flex items-center gap-2">
                        <InlineScoreBadge letter={scoreLetter} color={scoreColor} />
                        <ChevronRight className="h-5 w-5 text-neutral-300 transition-transform group-hover:translate-x-1 dark:text-neutral-600" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
