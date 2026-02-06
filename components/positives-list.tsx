import { CheckCircle, type LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface PositiveItem {
    text: string;
    icon?: string;
}

interface PositivesListProps {
    items: PositiveItem[];
}

export function PositivesList({ items }: PositivesListProps) {
    if (items.length === 0) return null;

    return (
        <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Positive aspects
            </h3>
            <ul className="space-y-2">
                {items.map((item, index) => {
                    const IconComponent = item.icon
                        ? (Icons[item.icon as keyof typeof Icons] as LucideIcon) || CheckCircle
                        : CheckCircle;

                    return (
                        <li
                            key={index}
                            className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                        >
                            <IconComponent className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{item.text}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
