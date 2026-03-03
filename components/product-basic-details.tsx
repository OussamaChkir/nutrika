import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store } from "lucide-react";

interface ProductBasicDetailsProps {
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

export function ProductBasicDetails({ countries, stores }: ProductBasicDetailsProps) {
    const cleanedCountries = cleanOffTags(countries);
    const cleanedStores = cleanOffTags(stores);

    if (!cleanedCountries.length && !cleanedStores.length) {
        return null;
    }

    return (
        <Card className="border-0 shadow-md overflow-hidden">
            <div className="flex">
                <div className="w-1 bg-gradient-to-b from-sky-400 to-sky-600 shrink-0" />
                <div className="flex-1">
                    <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <CardTitle className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                            Additional Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-5">
                        {cleanedCountries.length > 0 && (
                            <div className="flex gap-3 items-start">
                                <MapPin className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Countries</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cleanedCountries.map((country, idx) => (
                                            <Badge key={idx} variant="secondary" className="font-normal bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/40">
                                                {country}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {cleanedStores.length > 0 && (
                            <div className="flex gap-3 items-start">
                                <Store className="w-5 h-5 text-neutral-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Stores</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cleanedStores.map((store, idx) => (
                                            <Badge key={idx} variant="secondary" className="font-normal bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/40">
                                                {store}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </div>
            </div>
        </Card>
    );
}
