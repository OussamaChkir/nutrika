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

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ results: [], message: "Query too short" });
    }

    const results: SearchResult[] = [];

    try {
        // 1. Search Open Food Facts first
        const offResults = await searchProducts(query.trim(), 1, 10);

        if (offResults && offResults.products.length > 0) {
            for (const product of offResults.products) {
                results.push({
                    barcode: product.code,
                    name: getProductName(product),
                    brand: product.brands || undefined,
                    imageUrl: getProductImage(product) || undefined,
                    source: "openfoodfacts",
                });
            }
        }

        // 2. Also search local database
        const dbProducts = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: query.trim(), mode: "insensitive" } },
                    { brand: { contains: query.trim(), mode: "insensitive" } },
                    { barcode: { contains: query.trim() } },
                ],
                status: "APPROVED",
            },
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

        // 3. Return results (empty array if nothing found)
        return NextResponse.json({
            results,
            count: results.length,
            message: results.length === 0 ? "No products found" : undefined,
        });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { results: [], message: "Search failed", error: String(error) },
            { status: 500 }
        );
    }
}
