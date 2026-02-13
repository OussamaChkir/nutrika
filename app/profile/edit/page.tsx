"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, X } from "lucide-react";
import Link from "next/link";
import { ALLERGY_OPTIONS } from "@/lib/validators";

export default function ProfileEditPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

    // Load current profile
    useEffect(() => {
        fetch("/api/profile")
            .then((res) => res.json())
            .then((data) => {
                if (data.user) {
                    setWeight(data.user.weight?.toString() || "");
                    setHeight(data.user.height?.toString() || "");
                    setDateOfBirth(
                        data.user.dateOfBirth
                            ? new Date(data.user.dateOfBirth)
                                .toISOString()
                                .split("T")[0]
                            : ""
                    );
                    setSelectedAllergies(data.user.allergies || []);
                }
            })
            .catch(() => setError("Failed to load profile"))
            .finally(() => setIsLoading(false));
    }, []);

    const toggleAllergy = (allergy: string) => {
        setSelectedAllergies((prev) =>
            prev.includes(allergy)
                ? prev.filter((a) => a !== allergy)
                : [...prev, allergy]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    weight: weight ? parseFloat(weight) : null,
                    height: height ? parseFloat(height) : null,
                    dateOfBirth: dateOfBirth || null,
                    allergies: selectedAllergies,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            setSuccess(true);
            setTimeout(() => router.push("/profile"), 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-4 py-8">
            <Link
                href="/profile"
                className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Health Profile</CardTitle>
                    <CardDescription>
                        This information helps us give you personalized
                        nutritional recommendations and allergen warnings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Weight & Height */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight (kg)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="500"
                                    placeholder="e.g. 70"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">Height (cm)</Label>
                                <Input
                                    id="height"
                                    type="number"
                                    step="0.1"
                                    min="30"
                                    max="300"
                                    placeholder="e.g. 175"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Date of Birth */}
                        <div className="space-y-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Input
                                id="dob"
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                max={new Date().toISOString().split("T")[0]}
                            />
                        </div>

                        {/* Allergies */}
                        <div className="space-y-3">
                            <Label>Allergies & Intolerances</Label>
                            <p className="text-xs text-neutral-500">
                                Select any allergies or food intolerances you
                                have. We&apos;ll highlight these on product
                                pages.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {ALLERGY_OPTIONS.map((allergy) => {
                                    const isSelected =
                                        selectedAllergies.includes(allergy);
                                    return (
                                        <button
                                            key={allergy}
                                            type="button"
                                            onClick={() =>
                                                toggleAllergy(allergy)
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${isSelected
                                                    ? "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                                                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                                                }`}
                                        >
                                            {isSelected && (
                                                <X className="h-3 w-3" />
                                            )}
                                            {allergy}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Error / Success */}
                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                Profile saved! Redirecting...
                            </div>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="w-full gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Profile
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
