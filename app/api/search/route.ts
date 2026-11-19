import { NextRequest, NextResponse } from "next/server";
import { MIN_QUERY_LENGTH, searchCatalog } from "@/lib/products/search";

export type { SearchResult } from "@/lib/products/search";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const scoreLetter = searchParams.get("scoreLetter"); // A, B, C, D, E
    const sort = searchParams.get("sort"); // name_asc, name_desc, score_asc, score_desc

    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
        return NextResponse.json({ results: [], message: "Query too short" });
    }

    try {
        const results = await searchCatalog({ query, scoreLetter, sort });
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
