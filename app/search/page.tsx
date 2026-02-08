"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Package, Scan, Plus, X } from "lucide-react";

interface SearchResult {
    barcode: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    source: "openfoodfacts" | "database";
    score?: number;
    scoreLetter?: string;
}

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced search
    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/search?query=${encodeURIComponent(searchQuery.trim())}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Search failed");
            }

            setResults(data.results || []);
            setHasSearched(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Search failed");
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 400);

        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setHasSearched(false);
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            {/* Header */}
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Search Products
                </h1>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    Search by product name, brand, or barcode
                </p>
            </div>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <Input
                    type="text"
                    placeholder="Search for products..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-12 pr-12"
                    autoFocus
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="mt-8 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="mt-6 rounded-xl bg-red-50 p-4 text-center text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Results */}
            {!isLoading && results.length > 0 && (
                <div className="mt-6 space-y-3">
                    <p className="text-sm text-neutral-500">
                        Found {results.length} product{results.length !== 1 ? "s" : ""}
                    </p>
                    {results.map((result) => (
                        <Link
                            key={result.barcode}
                            href={`/product/${result.barcode}`}
                            className="block"
                        >
                            <Card className="transition-all hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800">
                                <CardContent className="flex items-center gap-4 p-4">
                                    {/* Image */}
                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                        {result.imageUrl ? (
                                            <Image
                                                src={result.imageUrl}
                                                alt={result.name}
                                                fill
                                                className="object-contain p-1"
                                                sizes="64px"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Package className="h-6 w-6 text-neutral-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                            {result.name}
                                        </p>
                                        {result.brand && (
                                            <p className="text-sm text-neutral-500 truncate">
                                                {result.brand}
                                            </p>
                                        )}
                                        <div className="mt-1 flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {result.source === "database" ? "Local" : "OFF"}
                                            </Badge>
                                            {result.scoreLetter && (
                                                <Badge className="text-xs">
                                                    Score: {result.scoreLetter}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Nothing Found State */}
            {!isLoading && hasSearched && results.length === 0 && (
                <div className="mt-8 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <Search className="h-10 w-10 text-neutral-400" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        No products found
                    </h2>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                        We couldn't find any products matching "{query}"
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link href={`/add-product?barcode=`}>
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="h-4 w-4" />
                                Add New Product
                            </Button>
                        </Link>
                        <Link href="/scan">
                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                <Scan className="h-4 w-4" />
                                Scan Barcode
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Initial state hint */}
            {!isLoading && !hasSearched && query.length === 0 && (
                <div className="mt-8 text-center text-neutral-500">
                    <p>Start typing to search for products</p>
                </div>
            )}
        </div>
    );
}
