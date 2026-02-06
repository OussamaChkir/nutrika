import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
    score: number;
    letter: "A" | "B" | "C" | "D" | "E";
    color: string;
    size?: "sm" | "md" | "lg";
    showScore?: boolean;
}

export function ScoreBadge({
    score,
    letter,
    color,
    size = "md",
    showScore = true,
}: ScoreBadgeProps) {
    const sizeClasses = {
        sm: "w-12 h-12 text-xl",
        md: "w-20 h-20 text-3xl",
        lg: "w-28 h-28 text-5xl",
    };

    const scoreSizeClasses = {
        sm: "text-[10px]",
        md: "text-xs",
        lg: "text-sm",
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center rounded-2xl font-bold text-white shadow-xl transition-transform hover:scale-105",
                sizeClasses[size]
            )}
            style={{
                backgroundColor: color,
                boxShadow: `0 10px 30px -5px ${color}40`,
            }}
        >
            <span className="leading-none">{letter}</span>
            {showScore && (
                <span className={cn("opacity-80", scoreSizeClasses[size])}>
                    {score}/100
                </span>
            )}
        </div>
    );
}

// Inline score badge for lists
interface InlineScoreBadgeProps {
    letter: "A" | "B" | "C" | "D" | "E";
    color: string;
}

export function InlineScoreBadge({ letter, color }: InlineScoreBadgeProps) {
    return (
        <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: color }}
        >
            {letter}
        </span>
    );
}
