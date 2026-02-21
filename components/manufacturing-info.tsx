"use client";

import { Factory, MapPin } from "lucide-react";

interface ManufacturingInfoProps {
    manufacturingPlaces?: string | null;
    origins?: string | null;
}

export function ManufacturingInfo({ manufacturingPlaces, origins }: ManufacturingInfoProps) {
    if (!manufacturingPlaces && !origins) return null;

    return (
        <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <Factory className="h-4 w-4 text-orange-500" />
                Manufacturing &amp; Origins
            </h3>

            <div className="space-y-2">
                {manufacturingPlaces && (
                    <div className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                        <Factory className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                        <div>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                Manufacturing / Processing Places
                            </p>
                            <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                                {manufacturingPlaces}
                            </p>
                        </div>
                    </div>
                )}

                {origins && (
                    <div className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                        <div>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                Product Origins
                            </p>
                            <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                                {origins}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
