import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Award, Leaf, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdvancedNutritionProps {
    nutritionGradeFr?: string;
    novaGroup?: number;
    ecoscoreScore?: number;
    ecoscoreGrade?: string;
    nutrimentLevels?: any;
    nutriscoreData?: any;
    ecoscoreData?: any;
}

export function AdvancedNutrition({
    nutritionGradeFr,
    novaGroup,
    ecoscoreScore,
    ecoscoreGrade,
    nutrimentLevels,
    nutriscoreData,
    ecoscoreData
}: AdvancedNutritionProps) {
    if (!nutritionGradeFr && !novaGroup && !ecoscoreScore && !nutrimentLevels && !nutriscoreData && !ecoscoreData) {
        return null;
    }

    const formatLevel = (level: string) => {
        if (!level) return 'Unknown';
        return level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ');
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
        }
    };

    return (
        <Card className="border-purple-100 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-neutral-900">
            <CardHeader className="pb-3 border-b border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-base font-semibold text-purple-900 dark:text-purple-100">
                        Advanced Nutrition Report
                    </CardTitle>
                </div>
                <CardDescription className="text-purple-600/70 dark:text-purple-400/70">
                    Premium and Admin exclusive insights
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
                {/* Grades row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {nutritionGradeFr && (
                        <div className="bg-white dark:bg-neutral-800/50 p-3 rounded-xl border border-purple-100 dark:border-purple-900/20 flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Nutri-Score FR</span>
                            <span className="text-2xl font-bold uppercase text-neutral-800 dark:text-neutral-200">{nutritionGradeFr}</span>
                        </div>
                    )}

                    {novaGroup && (
                        <div className="bg-white dark:bg-neutral-800/50 p-3 rounded-xl border border-purple-100 dark:border-purple-900/20 flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">NOVA Group</span>
                            <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{novaGroup}</span>
                        </div>
                    )}

                    {(ecoscoreGrade || ecoscoreScore !== undefined) && (
                        <div className="bg-white dark:bg-neutral-800/50 p-3 rounded-xl border border-purple-100 dark:border-purple-900/20 flex flex-col items-center justify-center text-center sm:col-span-1 col-span-2">
                            <div className="flex items-center gap-1 mb-1">
                                <Leaf className="w-3 h-3 text-green-500" />
                                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Eco-Score</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                {ecoscoreGrade && <span className="text-2xl font-bold uppercase text-neutral-800 dark:text-neutral-200">{ecoscoreGrade}</span>}
                                {ecoscoreScore !== undefined && <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">({ecoscoreScore}/100)</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Nutriment Levels */}
                {nutrimentLevels && Object.keys(nutrimentLevels).length > 0 && (
                    <div className="space-y-3 pt-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                            <Activity className="w-4 h-4 text-purple-500" />
                            Nutriment Levels
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                            {Object.entries(nutrimentLevels).map(([key, level]) => (
                                <div key={key} className="flex items-center justify-between text-sm py-1.5 border-b border-purple-50 dark:border-purple-900/20 last:border-0 sm:last:border-b">
                                    <span className="text-neutral-600 dark:text-neutral-400 capitalize">
                                        {key.replace(/-/g, ' ')}
                                    </span>
                                    <Badge variant="secondary" className={`font-medium ${getLevelColor(level as string)} border-0`}>
                                        {formatLevel(level as string)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Additional Raw Data Section */}
                {(nutriscoreData || ecoscoreData) && (
                    <div className="pt-4 border-t border-purple-100 dark:border-purple-900/30">
                        <details className="group">
                            <summary className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400 cursor-pointer list-none">
                                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                                View raw score components
                            </summary>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {nutriscoreData && (
                                    <div className="bg-purple-50/50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100/50 dark:border-purple-900/20 overflow-auto max-h-48 text-xs font-mono">
                                        <div className="text-purple-800 dark:text-purple-300 font-semibold mb-2 flex items-center gap-1.5">Nutri-Score Data</div>
                                        <pre className="text-neutral-600 dark:text-neutral-400">{JSON.stringify(nutriscoreData, null, 2)}</pre>
                                    </div>
                                )}
                                {ecoscoreData && (
                                    <div className="bg-green-50/50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100/50 dark:border-green-900/20 overflow-auto max-h-48 text-xs font-mono">
                                        <div className="text-green-800 dark:text-green-300 font-semibold mb-2 flex items-center gap-1.5">Eco-Score Data</div>
                                        <pre className="text-neutral-600 dark:text-neutral-400">{JSON.stringify(ecoscoreData, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        </details>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
