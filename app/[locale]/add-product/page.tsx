"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, ProductFormInput } from "@/lib/validators";
import { createProductAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, CheckCircle } from "lucide-react";

export default function AddProductPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const barcodeParam = searchParams.get("barcode");
    const isEdit = searchParams.get("edit") === "true";

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProductFormInput>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            barcode: barcodeParam || "",
        },
    });

    const onSubmit = async (data: ProductFormInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await createProductAction(data);

            if (!result.success) {
                setError(result.error || "Failed to submit product");
                setIsLoading(false);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/product/${data.barcode}`);
            }, 1500);
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="mx-auto max-w-lg px-4 py-16 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h1 className="mt-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {isEdit ? "Edit Submitted!" : "Product Added!"}
                </h1>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    {isEdit
                        ? "Your suggested changes are pending review."
                        : "Your product has been submitted for review."}
                </p>
                <p className="mt-4 text-sm text-neutral-500">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {isEdit ? "Suggest Product Edit" : "Add New Product"}
                    </CardTitle>
                    <CardDescription>
                        {isEdit
                            ? "Submit corrections or additional information for this product"
                            : "Help grow our database by adding a new product"}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Basic Information
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="barcode">Barcode *</Label>
                                <Input
                                    id="barcode"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g., 3017620422003"
                                    disabled={isLoading || !!barcodeParam}
                                    {...register("barcode")}
                                />
                                {errors.barcode && (
                                    <p className="text-sm text-red-600">{errors.barcode.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name *</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="e.g., Nutella Hazelnut Spread"
                                    disabled={isLoading}
                                    {...register("name")}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <Input
                                    id="brand"
                                    type="text"
                                    placeholder="e.g., Ferrero"
                                    disabled={isLoading}
                                    {...register("brand")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="imageUrl">Image URL</Label>
                                <Input
                                    id="imageUrl"
                                    type="url"
                                    placeholder="https://..."
                                    disabled={isLoading}
                                    {...register("imageUrl")}
                                />
                                {errors.imageUrl && (
                                    <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Nutrition */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Nutrition Facts (per 100g)
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="energy">Energy (kcal)</Label>
                                    <Input
                                        id="energy"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("energy")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fat">Fat (g)</Label>
                                    <Input
                                        id="fat"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("fat")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="saturatedFat">Saturated Fat (g)</Label>
                                    <Input
                                        id="saturatedFat"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("saturatedFat")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="carbohydrates">Carbs (g)</Label>
                                    <Input
                                        id="carbohydrates"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("carbohydrates")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sugars">Sugars (g)</Label>
                                    <Input
                                        id="sugars"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("sugars")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fiber">Fiber (g)</Label>
                                    <Input
                                        id="fiber"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("fiber")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="proteins">Proteins (g)</Label>
                                    <Input
                                        id="proteins"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("proteins")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="salt">Salt (g)</Label>
                                    <Input
                                        id="salt"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0"
                                        disabled={isLoading}
                                        {...register("salt")}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEdit ? "Submit Edit" : "Add Product"}
                        </Button>

                        <p className="text-center text-xs text-neutral-500">
                            Your submission will be reviewed before being published.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
