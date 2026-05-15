import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Award, Leaf, Flame, Droplets, Wheat, Beef, CandlestickChart, Package, Truck, TreePine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface AdvancedNutritionProps {
    nutritionGradeFr?: string;
    novaGroup?: number;
    ecoscoreScore?: number;
    ecoscoreGrade?: string;
    nutrimentLevels?: any;
    nutriscoreData?: any;
    ecoscoreData?: any;
}

/* ── NOVA Group helpers ──────────────────────────────── */
const novaConfig: Record<number, { label: string; description: string; bg: string; border: string; text: string; badge: string; ring: string }> = {
    1: {
        label: "1",
        description: "Unprocessed or minimally processed",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800/40",
        text: "text-emerald-700 dark:text-emerald-300",
        badge: "bg-emerald-500",
        ring: "ring-emerald-500/20",
    },
    2: {
        label: "2",
        description: "Processed culinary ingredients",
        bg: "bg-yellow-50 dark:bg-yellow-950/30",
        border: "border-yellow-200 dark:border-yellow-800/40",
        text: "text-yellow-700 dark:text-yellow-300",
        badge: "bg-yellow-500",
        ring: "ring-yellow-500/20",
    },
    3: {
        label: "3",
        description: "Processed foods",
        bg: "bg-orange-50 dark:bg-orange-950/30",
        border: "border-orange-200 dark:border-orange-800/40",
        text: "text-orange-700 dark:text-orange-300",
        badge: "bg-orange-500",
        ring: "ring-orange-500/20",
    },
    4: {
        label: "4",
        description: "Ultra-processed products",
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-200 dark:border-red-800/40",
        text: "text-red-700 dark:text-red-300",
        badge: "bg-red-500",
        ring: "ring-red-500/20",
    },
};

/* ── Nutri-Score breakdown helper ────────────────────── */
function NutriScoreBreakdown({ data }: { data: any }) {
    if (!data) return null;

    const negativeItems = [
        { key: "energy", label: "Energy", icon: Flame, value: data.energy_value ?? data.energy, points: data.energy_points },
        { key: "sugars", label: "Sugars", icon: CandlestickChart, value: data.sugars_value ?? data.sugars, points: data.sugars_points },
        { key: "saturated_fat", label: "Saturated Fat", icon: Droplets, value: data.saturated_fat_value ?? data.saturated_fat, points: data.saturated_fat_points },
        { key: "sodium", label: "Sodium", icon: Droplets, value: data.sodium_value ?? data.sodium, points: data.sodium_points },
    ].filter(i => i.points !== undefined && i.points !== null);

    const positiveItems = [
        { key: "fiber", label: "Fiber", icon: Wheat, value: data.fiber_value ?? data.fiber, points: data.fiber_points },
        { key: "proteins", label: "Proteins", icon: Beef, value: data.proteins_value ?? data.proteins, points: data.proteins_points },
        { key: "fruits_vegetables", label: "Fruits & Vegetables", icon: TreePine, value: data.fruits_vegetables_nuts_colza_walnut_olive_oils_value ?? data.fruits_vegetables_nuts, points: data.fruits_vegetables_nuts_colza_walnut_olive_oils_points ?? data.fruits_vegetables_nuts_points },
    ].filter(i => i.points !== undefined && i.points !== null);

    if (negativeItems.length === 0 && positiveItems.length === 0) return null;

    return (
        <div className="space-y-4 pt-4 border-t border-purple-100 dark:border-purple-900/30">
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                Nutri-Score Breakdown
            </h4>

            {negativeItems.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Negative Points</p>
                    <div className="grid gap-2">
                        {negativeItems.map(item => {
                            const Icon = item.icon;
                            const maxPoints = 10;
                            const pct = Math.min(((item.points ?? 0) / maxPoints) * 100, 100);
                            return (
                                <div key={item.key} className="flex items-center gap-3 bg-red-50/60 dark:bg-red-950/20 rounded-lg px-3 py-2">
                                    <Icon className="w-4 h-4 text-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.label}</span>
                                            <span className="font-bold text-red-600 dark:text-red-400">{item.points} pts</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {positiveItems.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Positive Points</p>
                    <div className="grid gap-2">
                        {positiveItems.map(item => {
                            const Icon = item.icon;
                            const maxPoints = 5;
                            const pct = Math.min(((item.points ?? 0) / maxPoints) * 100, 100);
                            return (
                                <div key={item.key} className="flex items-center gap-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
                                    <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.label}</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.points} pts</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Overall score */}
            {data.score !== undefined && (
                <div className="flex items-center justify-between bg-purple-50/80 dark:bg-purple-900/20 rounded-lg px-4 py-2.5 border border-purple-100 dark:border-purple-800/30">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Overall Nutri-Score Points</span>
                    <span className="text-lg font-bold text-purple-800 dark:text-purple-200">{data.score}</span>
                </div>
            )}
        </div>
    );
}

/* ── Eco-Score breakdown helper ──────────────────────── */
function EcoScoreBreakdown({ data }: { data: any }) {
    if (!data) return null;

    const rows: { 
        label: string; 
        description: string; 
        impact: 'positive' | 'negative' | 'neutral' | 'excellent' | 'good' | 'moderate' | 'poor'; 
        icon: React.ComponentType<any> 
    }[] = [];

    if (data.agribalyse?.score !== undefined) {
        const s = data.agribalyse.score;
        let impact: any = 'moderate';
        let desc = 'Average environmental impact';
        if (s >= 80) { impact = 'excellent'; desc = 'Very low environmental impact from farming and processing'; }
        else if (s >= 60) { impact = 'good'; desc = 'Low environmental impact from farming and processing'; }
        else if (s >= 40) { impact = 'moderate'; desc = 'Moderate environmental impact'; }
        else { impact = 'poor'; desc = 'High environmental impact from farming and processing'; }
        
        rows.push({ 
            label: "Farming & Processing", 
            description: desc, 
            impact, 
            icon: TreePine 
        });
    }

    if (data.adjustments?.packaging?.score !== undefined) {
        const s = data.adjustments.packaging.score;
        let impact: any = 'neutral';
        let desc = 'Standard packaging impact';
        if (s > 0) { impact = 'positive'; desc = 'Eco-friendly or recyclable packaging'; }
        else if (s < 0) { impact = 'negative'; desc = 'Packaging has negative environmental impact'; }
        
        rows.push({ label: "Packaging", description: desc, impact, icon: Package });
    }

    if (data.adjustments?.origins_of_ingredients?.value !== undefined) {
        const s = data.adjustments.origins_of_ingredients.value;
        let impact: any = 'neutral';
        let desc = 'Standard or mixed ingredient origins';
        if (s > 0) { impact = 'positive'; desc = 'Locally sourced ingredients (reduces transport emissions)'; }
        else if (s < 0) { impact = 'negative'; desc = 'Ingredients transported from far distances'; }
        
        rows.push({ label: "Ingredient Origins", description: desc, impact, icon: Truck });
    }

    if (data.adjustments?.production_system?.value !== undefined) {
        const s = data.adjustments.production_system.value;
        let impact: any = 'neutral';
        let desc = 'Standard production practices';
        if (s > 0) { impact = 'positive'; desc = 'Sustainable or organic production practices'; }
        else if (s < 0) { impact = 'negative'; desc = 'Production system has negative environmental impact'; }
        
        rows.push({ label: "Production System", description: desc, impact, icon: Leaf });
    }

    if (rows.length === 0) return null;

    const getImpactStyles = (impact: string) => {
        switch (impact) {
            case 'excellent':
            case 'positive':
                return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100/50 dark:bg-emerald-900/30', label: impact === 'excellent' ? 'Excellent' : 'Positive Impact' };
            case 'good':
                return { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100/50 dark:bg-green-900/30', label: 'Good' };
            case 'moderate':
            case 'neutral':
                return { text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100/50 dark:bg-yellow-900/30', label: impact === 'moderate' ? 'Moderate' : 'Neutral Impact' };
            case 'poor':
            case 'negative':
                return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100/50 dark:bg-red-900/30', label: impact === 'poor' ? 'Poor' : 'Negative Impact' };
            default:
                return { text: 'text-neutral-700 dark:text-neutral-400', bg: 'bg-neutral-100/50 dark:bg-neutral-800/30', label: 'Unknown' };
        }
    };

    return (
        <div className="space-y-4 pt-4 border-t border-green-100 dark:border-green-900/30">
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-500" />
                Eco-Score Breakdown
            </h4>
            <div className="grid gap-2">
                {rows.map((row, i) => {
                    const Icon = row.icon;
                    const styles = getImpactStyles(row.impact);
                    return (
                        <div key={i} className="flex items-start gap-3 bg-green-50/40 dark:bg-green-950/10 rounded-lg p-3 border border-green-100/50 dark:border-green-900/20">
                            <div className={`p-2 rounded-md ${styles.bg}`}>
                                <Icon className={`w-4 h-4 ${styles.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5 gap-2">
                                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{row.label}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${styles.bg} ${styles.text} whitespace-nowrap`}>
                                        {styles.label}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">{row.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────────────── */
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

    const nova = novaGroup ? novaConfig[novaGroup] : null;

    return (
        <Card className="border-0 shadow-lg shadow-purple-100/30 dark:shadow-purple-950/20 bg-gradient-to-br from-purple-50/60 via-white to-white dark:from-purple-950/20 dark:via-neutral-900 dark:to-neutral-900 overflow-hidden">
            {/* Purple accent bar */}
            <div className="h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500" />

            <CardHeader className="pb-3 border-b border-purple-100/60 dark:border-purple-900/30">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                        <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-base font-semibold text-purple-900 dark:text-purple-100">
                        Advanced Nutrition Report
                    </CardTitle>
                </div>
                <CardDescription className="text-purple-600/70 dark:text-purple-400/70">

                </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
                {/* ── Grades row ────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Nutri-Score */}
                    {nutritionGradeFr && (
                        <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-purple-100/50 dark:border-purple-900/20 flex flex-col items-center justify-center text-center shadow-sm">
                            <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Nutri-Score</span>
                            {['a', 'b', 'c', 'd', 'e'].includes(nutritionGradeFr.toLowerCase()) ? (
                                <div className="relative w-28 h-14">
                                    <Image
                                        src={`/nutri-score/nutriscore-${nutritionGradeFr.toLowerCase()}-new-fr.svg`}
                                        alt={`Nutri-Score ${nutritionGradeFr.toUpperCase()}`}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="relative w-28 h-14">
                                    <Image
                                        src={`/nutri-score/nutriscore-not-applicable-new-fr.svg`}
                                        alt="Nutri-Score Not Applicable"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOVA Group — colored */}
                    {novaGroup && nova && (
                        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm ${nova.bg} ${nova.border}`}>
                            <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">NOVA Group</span>
                            <div className={`w-12 h-12 rounded-full ${nova.badge} ring-4 ${nova.ring} flex items-center justify-center mb-1.5 shadow-md`}>
                                <span className="text-xl font-black text-white">{novaGroup}</span>
                            </div>
                            <span className={`text-[11px] font-medium ${nova.text} leading-tight max-w-[120px]`}>{nova.description}</span>
                        </div>
                    )}

                    {/* Eco-Score */}
                    {(ecoscoreGrade || ecoscoreScore !== undefined) && (
                        <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-green-100/50 dark:border-green-900/20 flex flex-col items-center justify-center text-center shadow-sm">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Leaf className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Eco-Score</span>
                            </div>
                            {ecoscoreGrade && ['a', 'b', 'c', 'd', 'e', 'f', 'a-plus'].includes(ecoscoreGrade.toLowerCase()) ? (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="relative w-24 h-12">
                                        <Image
                                            src={`/green-score/green-score-${ecoscoreGrade.toLowerCase()}.svg`}
                                            alt={`Eco-Score ${ecoscoreGrade.toUpperCase()}`}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    {ecoscoreScore !== undefined && <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mt-1">({ecoscoreScore}/100)</span>}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="relative w-24 h-12">
                                        <Image
                                            src="/green-score/green-score-not-applicable.svg"
                                            alt="Eco-Score Not Applicable"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Nutriment Levels ──────────────────────── */}
                {nutrimentLevels && Object.keys(nutrimentLevels).length > 0 && (
                    <div className="space-y-3 pt-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                            <Activity className="w-4 h-4 text-purple-500" />
                            Nutriment Levels
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                            {Object.entries(nutrimentLevels).map(([key, level]) => (
                                <div key={key} className="flex items-center justify-between text-sm py-2 px-3 bg-white/60 dark:bg-neutral-800/40 rounded-lg border border-purple-50 dark:border-purple-900/15">
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

                {/* ── Detailed Score Breakdowns ─────────────── */}
                <NutriScoreBreakdown data={nutriscoreData} />
                <EcoScoreBreakdown data={ecoscoreData} />
            </CardContent>
        </Card>
    );
}
