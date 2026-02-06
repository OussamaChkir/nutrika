import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AllergenInfo {
    name: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
}

interface AllergenTagsProps {
    allergens: AllergenInfo[];
    overallSeverity?: "LOW" | "MEDIUM" | "HIGH";
}

export function AllergenTags({ allergens, overallSeverity }: AllergenTagsProps) {
    if (allergens.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Info className="h-4 w-4" />
                No allergens detected
            </div>
        );
    }

    const getSeverityIcon = (severity: "LOW" | "MEDIUM" | "HIGH") => {
        switch (severity) {
            case "HIGH":
                return <AlertTriangle className="h-3 w-3" />;
            case "MEDIUM":
                return <AlertCircle className="h-3 w-3" />;
            default:
                return <Info className="h-3 w-3" />;
        }
    };

    const getSeverityColor = (severity: "LOW" | "MEDIUM" | "HIGH") => {
        switch (severity) {
            case "HIGH":
                return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
            case "MEDIUM":
                return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
            default:
                return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700";
        }
    };

    const getOverallWarning = () => {
        switch (overallSeverity) {
            case "HIGH":
                return {
                    text: "Contains major allergens",
                    className: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
                    icon: <AlertTriangle className="h-4 w-4" />,
                };
            case "MEDIUM":
                return {
                    text: "Contains common allergens",
                    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                    icon: <AlertCircle className="h-4 w-4" />,
                };
            default:
                return null;
        }
    };

    const warning = getOverallWarning();

    return (
        <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                Allergens
            </h3>

            {warning && (
                <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${warning.className}`}>
                    {warning.icon}
                    {warning.text}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {allergens.map((allergen, index) => (
                    <Badge
                        key={index}
                        variant="outline"
                        className={`flex items-center gap-1.5 capitalize ${getSeverityColor(allergen.severity)}`}
                    >
                        {getSeverityIcon(allergen.severity)}
                        {allergen.name}
                    </Badge>
                ))}
            </div>
        </div>
    );
}
