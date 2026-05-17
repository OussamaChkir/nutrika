import { Badge } from "@/components/ui/badge";
import { Leaf, HeartPulse, Dumbbell, Baby, Salad } from "lucide-react";

interface DietaryTagsProps {
    tags: string[];
}

export function DietaryTags({ tags }: DietaryTagsProps) {
    if (!tags || tags.length === 0) return null;

    const getTagIcon = (tag: string) => {
        switch (tag) {
            case "Keto friendly":
                return <Salad className="w-3.5 h-3.5 mr-1" />;
            case "Vegan":
                return <Leaf className="w-3.5 h-3.5 mr-1" />;
            case "Muscle gain":
                return <Dumbbell className="w-3.5 h-3.5 mr-1" />;
            case "Diabetic safe":
                return <HeartPulse className="w-3.5 h-3.5 mr-1" />;
            case "Pregnancy safe":
                return <Baby className="w-3.5 h-3.5 mr-1" />;
            default:
                return null;
        }
    };

    const getTagStyles = (tag: string) => {
        switch (tag) {
            case "Keto friendly":
                return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
            case "Vegan":
                return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50";
            case "Muscle gain":
                return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
            case "Diabetic safe":
                return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
            case "Pregnancy safe":
                return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50";
            default:
                return "bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700";
        }
    };

    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag) => (
                <Badge
                    key={tag}
                    variant="outline"
                    className={`flex items-center text-xs font-medium px-2.5 py-1 ${getTagStyles(
                        tag
                    )}`}
                >
                    {getTagIcon(tag)}
                    {tag}
                </Badge>
            ))}
        </div>
    );
}
