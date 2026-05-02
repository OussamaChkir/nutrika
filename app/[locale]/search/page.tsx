"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Loader2,
    Package,
    Scan,
    Plus,
    X,
    SlidersHorizontal,
    ArrowUpDown,
    ChevronDown,
} from "lucide-react";

interface SearchResult {
    barcode: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    source: "openfoodfacts" | "database";
    score?: number;
    scoreLetter?: string;
}

const SCORE_LETTERS = ["A", "B", "C", "D", "E"] as const;
const SCORE_COLORS: Record<string, string> = {
    A: "bg-emerald-500 text-white shadow-emerald-500/20",
    B: "bg-lime-500 text-white shadow-lime-500/20",
    C: "bg-amber-500 text-white shadow-amber-500/20",
    D: "bg-orange-500 text-white shadow-orange-500/20",
    E: "bg-red-500 text-white shadow-red-500/20",
};

const SORT_OPTIONS = [
    { value: "", label: "Relevance" },
    { value: "name_asc", label: "Name A → Z" },
    { value: "name_desc", label: "Name Z → A" },
    { value: "score_desc", label: "Best Score First" },
    { value: "score_asc", label: "Lowest Score First" },
];

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [selectedScore, setSelectedScore] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("");

    const activeFilterCount =
        (selectedScore ? 1 : 0) + (sortBy ? 1 : 0);

    // Build search URL with filters
    const buildSearchUrl = useCallback(
        (searchQuery: string) => {
            const params = new URLSearchParams({
                query: searchQuery.trim(),
            });
            if (selectedScore) params.set("scoreLetter", selectedScore);
            if (sortBy) params.set("sort", sortBy);
            return `/api/search?${params.toString()}`;
        },
        [selectedScore, sortBy]
    );

    // Debounced search
    const performSearch = useCallback(
        async (searchQuery: string) => {
            if (searchQuery.trim().length < 2) {
                setResults([]);
                setHasSearched(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(buildSearchUrl(searchQuery));
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
        },
        [buildSearchUrl]
    );

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

    const clearAllFilters = () => {
        setSelectedScore("");
        setSortBy("");
    };

    const toggleScore = (letter: string) => {
        setSelectedScore((prev) => (prev === letter ? "" : letter));
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
                    className="pl-12 pr-24"
                    autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {query && (
                        <button
                            onClick={handleClear}
                            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative p-1.5 rounded-lg transition-colors ${showFilters || activeFilterCount > 0
                                ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            }`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Filters
                        </h3>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Score Filter */}
                    <div className="mb-4">
                        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            Nutri-Score
                        </p>
                        <div className="flex gap-2">
                            {SCORE_LETTERS.map((letter) => (
                                <button
                                    key={letter}
                                    onClick={() => toggleScore(letter)}
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-all ${selectedScore === letter
                                            ? `${SCORE_COLORS[letter]} shadow-lg scale-110`
                                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                                        }`}
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort */}
                    <div>
                        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <ArrowUpDown className="h-3 w-3" />
                            Sort By
                        </p>
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 pr-8 text-sm text-neutral-700 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        </div>
                    </div>
                </div>
            )}

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
                        {activeFilterCount > 0 && (
                            <span className="ml-1 text-orange-500">
                                ({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active)
                            </span>
                        )}
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
                                                <span
                                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${SCORE_COLORS[result.scoreLetter.toUpperCase()] ||
                                                        "bg-neutral-200 text-neutral-700"
                                                        }`}
                                                >
                                                    {result.scoreLetter.toUpperCase()}
                                                </span>
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
                        We couldn&apos;t find any products matching &quot;{query}&quot;
                        {activeFilterCount > 0 && " with the selected filters"}
                    </p>

                    {activeFilterCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={clearAllFilters}
                            className="mt-4 gap-2"
                        >
                            <X className="h-4 w-4" />
                            Clear Filters
                        </Button>
                    )}

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
