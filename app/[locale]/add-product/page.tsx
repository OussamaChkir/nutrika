"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, ProductFormInput, DIETARY_TAG_OPTIONS } from "@/lib/validators";
import { createProductAction, getProductForEdit } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, CheckCircle, Edit, AlertTriangle } from "lucide-react";

export default function AddProductPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const barcodeParam = searchParams.get("barcode");
    const isEdit = searchParams.get("edit") === "true";

    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingProduct, setIsFetchingProduct] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ProductFormInput>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            barcode: barcodeParam || "",
        },
    });

    // Pre-fill form with existing product data in edit mode
    useEffect(() => {
        if (isEdit && barcodeParam) {
            setIsFetchingProduct(true);
            getProductForEdit(barcodeParam)
                .then((product) => {
                    if (product) {
                        reset({
                            barcode: product.barcode,
                            name: product.name,
                            brand: product.brand || "",
                            imageUrl: product.imageUrl || "",
                            energy: product.energy ?? undefined,
                            fat: product.fat ?? undefined,
                            saturatedFat: product.saturatedFat ?? undefined,
                            carbohydrates: product.carbohydrates ?? undefined,
                            sugars: product.sugars ?? undefined,
                            fiber: product.fiber ?? undefined,
                            proteins: product.proteins ?? undefined,
                            salt: product.salt ?? undefined,
                            allergens: product.allergens?.join(", ") || "",
                            allergensSeverity: (product.allergensSeverity as "LOW" | "MEDIUM" | "HIGH") || "LOW",
                            manufacturingPlaces: product.manufacturingPlaces || "",
                            origins: product.origins || "",
                            dietaryTags: product.dietaryTags || [],
                        });
                    }
                })
                .finally(() => setIsFetchingProduct(false));
        }
    }, [isEdit, barcodeParam, reset]);

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

    if (isFetchingProduct) {
        return (
            <div className="mx-auto max-w-lg px-4 py-16 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
                <p className="mt-4 text-sm text-neutral-500">Loading product data...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isEdit ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        {isEdit ? "Edit Product" : "Add New Product"}
                    </CardTitle>
                    <CardDescription>
                        {isEdit
                            ? "Edit any field below and submit your changes for review"
                            : "Help grow our database by adding a new product"}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {isEdit && (
                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                            <AlertTriangle className="mt-0.5 h-5 w-5 text-blue-500 shrink-0" />
                            <div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    All fields are pre-filled with the current product data. Edit any field you want to change and submit.
                                </p>
                            </div>
                        </div>
                    )}

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

                        <Separator />

                        {/* Allergens */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Allergens
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="allergens">Allergens</Label>
                                <Input
                                    id="allergens"
                                    type="text"
                                    placeholder="e.g., Gluten, Milk, Eggs"
                                    disabled={isLoading}
                                    {...register("allergens")}
                                />
                                <p className="text-xs text-neutral-500">
                                    Separate multiple allergens with commas
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="allergensSeverity">Allergen Severity</Label>
                                <select
                                    id="allergensSeverity"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isLoading}
                                    {...register("allergensSeverity")}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>

                        <Separator />

                        {/* Manufacturing & Origins */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Manufacturing &amp; Origins
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="manufacturingPlaces">Manufacturing Places</Label>
                                <Input
                                    id="manufacturingPlaces"
                                    type="text"
                                    placeholder="e.g., France, Germany"
                                    disabled={isLoading}
                                    {...register("manufacturingPlaces")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="origins">Origins</Label>
                                <Input
                                    id="origins"
                                    type="text"
                                    placeholder="e.g., European Union"
                                    disabled={isLoading}
                                    {...register("origins")}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Dietary Tags */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Dietary Tags
                            </h3>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {DIETARY_TAG_OPTIONS.map((tag) => (
                                    <div key={tag} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`tag-${tag}`}
                                            value={tag}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            {...register("dietaryTags")}
                                        />
                                        <Label htmlFor={`tag-${tag}`} className="text-sm font-normal cursor-pointer">
                                            {tag}
                                        </Label>
                                    </div>
                                ))}
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
