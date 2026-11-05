// F8: look up a product that was scanned while offline, once the connection is back.
//
// Returns the normalized product (public catalogue data only), never anything about the user.
// It does not write to the database: the full product page does that when the user opens it.
// `no-store`, so no cache (browser or service worker) keeps a copy of the answer.

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { isValidBarcode } from "@/lib/offline/policy";
import { normalizeOffProduct, productFromStored } from "@/lib/product";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: { params: Promise<{ barcode: string }> }) {
    if (!isFeatureEnabled("offlineMode")) return json({ error: "disabled" }, 404);
    const { barcode } = await params;
    if (!isValidBarcode(barcode)) return json({ error: "bad_barcode" }, 400);

    try {
        const stored = await prisma.product.findUnique({ where: { barcode } });
        if (stored) {
            // Only approved catalogue products are shared. A pending product is treated as unknown.
            if (stored.status !== "APPROVED") return json({ error: "not_found" }, 404);
            return json({ product: productFromStored(stored) });
        }
        const off = await fetchProductByBarcode(barcode);
        if (!off) return json({ error: "not_found" }, 404);
        return json({ product: normalizeOffProduct({ ...off, code: off.code ?? barcode }) });
    } catch (error) {
        console.error("Offline product lookup failed:", error instanceof Error ? error.message : "unknown error");
        return json({ error: "server" }, 500);
    }
}
