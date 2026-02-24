import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ShoppingBag, Tags } from "lucide-react";

interface ProductBasicDetailsProps {
    categories?: string[];
    countries?: string[];
    stores?: string[];
}

export function cleanOffTags(tags?: string[] | string): string[] {
    if (!tags) return [];

    // Process comma-separated strings
    if (typeof tags === 'string') {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).map(tag => {
            return tag.charAt(0).toUpperCase() + tag.slice(1);
        });
    }

    // Process arrays
    if (!Array.isArray(tags)) return [];

    return tags.map((tag: string) => {
        // Remove prefix like "en:", "fr:", etc. and replace hyphens with spaces
        return tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
    }).filter((tag: string) => tag && tag.trim().length > 0).map((tag: string) => {
        // Capitalize first letter
        return tag.charAt(0).toUpperCase() + tag.slice(1);
    });
}

export function ProductBasicDetails({ categories, countries, stores }: ProductBasicDetailsProps) {
    const cleanedCategories = cleanOffTags(categories);
    const cleanedCountries = cleanOffTags(countries);
    const cleanedStores = cleanOffTags(stores);

    if (!cleanedCategories.length && !cleanedCountries.length && !cleanedStores.length) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <CardTitle className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                    Additional Details
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {cleanedCategories.length > 0 && (
                    <div className="flex gap-3 items-start">
                        <Tags className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Categories</h4>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                {cleanedCategories.join(", ")}
                            </p>
                        </div>
                    </div>
                )}

                {cleanedCountries.length > 0 && (
                    <div className="flex gap-3 items-start">
                        <MapPin className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Countries</h4>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                {cleanedCountries.join(", ")}
                            </p>
                        </div>
                    </div>
                )}

                {cleanedStores.length > 0 && (
                    <div className="flex gap-3 items-start">
                        <ShoppingBag className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Stores</h4>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                {cleanedStores.join(", ")}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
