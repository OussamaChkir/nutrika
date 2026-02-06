import { AlertTriangle, type LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface NegativeItem {
    text: string;
    icon?: string;
}

interface NegativesListProps {
    items: NegativeItem[];
}

export function NegativesList({ items }: NegativesListProps) {
    if (items.length === 0) return null;

    return (
        <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Negative aspects
            </h3>
            <ul className="space-y-2">
                {items.map((item, index) => {
                    const IconComponent = item.icon
                        ? (Icons[item.icon as keyof typeof Icons] as LucideIcon) || AlertTriangle
                        : AlertTriangle;

                    return (
                        <li
                            key={index}
                            className="flex items-start gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
                        >
                            <IconComponent className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                            <span>{item.text}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
