"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export function CalculatorClient() {
    const t = useTranslations("Calculator");

    const [age, setAge] = useState<number | "">("");
    const [gender, setGender] = useState<"male" | "female">("male");
    const [height, setHeight] = useState<number | "">("");
    const [weight, setWeight] = useState<number | "">("");
    const [activityLevel, setActivityLevel] = useState<"sedentary" | "light" | "moderate" | "active" | "veryActive">("moderate");
    const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("maintain");
    
    const [results, setResults] = useState<{
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    } | null>(null);

    const calculate = () => {
        if (!age || !height || !weight) return;

        // Mifflin-St Jeor Equation
        let bmr = 10 * weight + 6.25 * height - 5 * age;
        bmr += gender === "male" ? 5 : -161;

        let multiplier = 1.2;
        switch (activityLevel) {
            case "sedentary": multiplier = 1.2; break;
            case "light": multiplier = 1.375; break;
            case "moderate": multiplier = 1.55; break;
            case "active": multiplier = 1.725; break;
            case "veryActive": multiplier = 1.9; break;
        }

        let tdee = bmr * multiplier;

        if (goal === "lose") tdee -= 500;
        if (goal === "gain") tdee += 500;

        // 30% protein, 40% carbs, 30% fat
        const proteinCalories = tdee * 0.3;
        const carbsCalories = tdee * 0.4;
        const fatsCalories = tdee * 0.3;

        setResults({
            calories: Math.round(tdee),
            protein: Math.round(proteinCalories / 4),
            carbs: Math.round(carbsCalories / 4),
            fats: Math.round(fatsCalories / 9),
        });
    };

    return (
        <div className="mx-auto max-w-4xl py-12 px-4 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{t("title")}</h1>
                    <p className="text-neutral-600 dark:text-neutral-400">{t("description")}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Gender */}
                        <div className="space-y-2">
                            <Label>{t("gender")}</Label>
                            <div className="flex gap-4">
                                <Button 
                                    type="button"
                                    variant={gender === "male" ? "default" : "outline"}
                                    onClick={() => setGender("male")}
                                    className={gender === "male" ? "bg-orange-500 hover:bg-orange-600" : ""}
                                >
                                    {t("male")}
                                </Button>
                                <Button 
                                    type="button"
                                    variant={gender === "female" ? "default" : "outline"}
                                    onClick={() => setGender("female")}
                                    className={gender === "female" ? "bg-orange-500 hover:bg-orange-600" : ""}
                                >
                                    {t("female")}
                                </Button>
                            </div>
                        </div>

                        {/* Age, Height, Weight */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="age">{t("age")}</Label>
                                <Input id="age" type="number" min="1" max="120" value={age} onChange={(e) => setAge(Number(e.target.value) || "")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">{t("height")}</Label>
                                <Input id="height" type="number" min="50" max="250" value={height} onChange={(e) => setHeight(Number(e.target.value) || "")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight">{t("weight")}</Label>
                                <Input id="weight" type="number" min="20" max="300" value={weight} onChange={(e) => setWeight(Number(e.target.value) || "")} />
                            </div>
                        </div>

                        {/* Activity Level */}
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="activityLevel">{t("activityLevel")}</Label>
                            <select 
                                id="activityLevel"
                                value={activityLevel} 
                                onChange={(e) => setActivityLevel(e.target.value as any)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="sedentary">{t("sedentary")}</option>
                                <option value="light">{t("light")}</option>
                                <option value="moderate">{t("moderate")}</option>
                                <option value="active">{t("active")}</option>
                                <option value="veryActive">{t("veryActive")}</option>
                            </select>
                        </div>

                        {/* Goal */}
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="goal">{t("goal")}</Label>
                            <select 
                                id="goal"
                                value={goal} 
                                onChange={(e) => setGoal(e.target.value as any)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="lose">{t("lose")}</option>
                                <option value="maintain">{t("maintain")}</option>
                                <option value="gain">{t("gain")}</option>
                            </select>
                        </div>

                        <Button 
                            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-500 to-orangina-400 hover:from-orange-600 hover:to-orange-500"
                            onClick={calculate}
                            disabled={!age || !height || !weight}
                        >
                            {t("calculate")}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                <div>
                    {results ? (
                        <Card className="h-full border-orange-200 dark:border-orange-900/50 shadow-orange-100 dark:shadow-none shadow-lg animate-fade-in-up">
                            <CardHeader className="bg-orange-50/50 dark:bg-orange-950/20 pb-4 border-b border-orange-100 dark:border-orange-900/50">
                                <CardTitle className="text-orange-600 dark:text-orange-400">{t("results")}</CardTitle>
                                <CardDescription>{t("dailyCalories")}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 text-center space-y-8">
                                <div>
                                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-orangina-400 tracking-tight">
                                        {results.calories}
                                    </div>
                                    <div className="text-sm font-medium text-neutral-500 uppercase tracking-widest mt-2">KCAL / DAY</div>
                                </div>
                                
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-neutral-700 dark:text-neutral-300 text-left">{t("macros")}</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.protein}g</div>
                                            <div className="text-xs text-blue-500 font-medium uppercase mt-1">{t("protein")}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
                                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{results.carbs}g</div>
                                            <div className="text-xs text-emerald-500 font-medium uppercase mt-1">{t("carbs")}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50">
                                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{results.fats}g</div>
                                            <div className="text-xs text-amber-500 font-medium uppercase mt-1">{t("fats")}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                            <Calculator className="w-12 h-12 mb-4 opacity-50" />
                            <p>Fill out the form and click Calculate to see your results.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
