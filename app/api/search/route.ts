"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchProducts, getProductName, getProductImage } from "@/lib/openfoodfacts";

export interface SearchResult {
    barcode: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    source: "openfoodfacts" | "database";
    score?: number;
    scoreLetter?: string;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const scoreLetter = searchParams.get("scoreLetter"); // A, B, C, D, E
    const sort = searchParams.get("sort"); // name_asc, name_desc, score_asc, score_desc

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ results: [], message: "Query too short" });
    }

    const results: SearchResult[] = [];

    try {
        // 1. Search Open Food Facts first
        const offResults = await searchProducts(query.trim(), 1, 10);

        if (offResults && offResults.products.length > 0) {
            for (const product of offResults.products) {
                const grade = product.nutriscore_grade?.toUpperCase();
                results.push({
                    barcode: product.code,
                    name: getProductName(product),
                    brand: product.brands || undefined,
                    imageUrl: getProductImage(product) || undefined,
                    source: "openfoodfacts",
                    scoreLetter: grade || undefined,
                });
            }
        }

        // 2. Also search local database
        const dbWhere: Record<string, unknown> = {
            OR: [
                { name: { contains: query.trim(), mode: "insensitive" } },
                { brand: { contains: query.trim(), mode: "insensitive" } },
                { barcode: { contains: query.trim() } },
            ],
            status: "APPROVED",
        };

        // Apply score letter filter to DB query
        if (scoreLetter && ["A", "B", "C", "D", "E"].includes(scoreLetter)) {
            dbWhere.scoreLetter = scoreLetter;
        }

        const dbProducts = await prisma.product.findMany({
            where: dbWhere,
            take: 10,
            select: {
                barcode: true,
                name: true,
                brand: true,
                imageUrl: true,
                score: true,
                scoreLetter: true,
            },
        });

        // Add database results (avoid duplicates)
        const existingBarcodes = new Set(results.map((r) => r.barcode));
        for (const product of dbProducts) {
            if (!existingBarcodes.has(product.barcode)) {
                results.push({
                    barcode: product.barcode,
                    name: product.name,
                    brand: product.brand || undefined,
                    imageUrl: product.imageUrl || undefined,
                    source: "database",
                    score: product.score,
                    scoreLetter: product.scoreLetter,
                });
            }
        }

        // 3. Apply score letter filter to combined results (client-side for OFF results)
        let filteredResults = results;
        if (scoreLetter && ["A", "B", "C", "D", "E"].includes(scoreLetter)) {
            filteredResults = results.filter(
                (r) => r.scoreLetter?.toUpperCase() === scoreLetter
            );
        }

        // 4. Sort results
        if (sort) {
            filteredResults.sort((a, b) => {
                switch (sort) {
                    case "name_asc":
                        return a.name.localeCompare(b.name);
                    case "name_desc":
                        return b.name.localeCompare(a.name);
                    case "score_asc":
                        return (a.score ?? 50) - (b.score ?? 50);
                    case "score_desc":
                        return (b.score ?? 50) - (a.score ?? 50);
                    default:
                        return 0;
                }
            });
        }

        // 5. Return results
        return NextResponse.json({
            results: filteredResults,
            count: filteredResults.length,
            message: filteredResults.length === 0 ? "No products found" : undefined,
        });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { results: [], message: "Search failed", error: String(error) },
            { status: 500 }
        );
    }
}
