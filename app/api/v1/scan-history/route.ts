import { listScanHistory, MAX_HISTORY, recordScan } from "@/lib/history/service";
import { apiOk, authenticate, parseBody, serviceError } from "@/lib/mobile/http";
import { readProfileHeader } from "@/lib/mobile/profile-header";
import { scanBody } from "@/lib/mobile/schemas";

// GET /api/v1/scan-history – the last 10 scanned products, newest first.
export async function GET(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    try {
        const rows = await listScanHistory(authed.claims.userId);
        const items = rows.map((row) => ({
            scannedAt: row.scannedAt.toISOString(),
            product: {
                barcode: row.product.barcode,
                name: row.product.name,
                brand: row.product.brand,
                imageUrl: row.product.imageUrl,
                score: row.product.score,
                scoreLetter: String(row.product.scoreLetter),
                scoreColor: row.product.scoreColor,
            },
        }));
        return apiOk({ items, max: MAX_HISTORY });
    } catch (error) {
        console.error("v1 history error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}

// POST /api/v1/scan-history – { barcode }. Records the scan (and the insights record for users who
// opted in, tagged with the profile in X-Profile-Id). 404 if the product is not in the catalogue yet:
// open it with GET /products/{barcode} first, which adds it.
export async function POST(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const parsed = await parseBody(request, scanBody);
    if ("response" in parsed) return parsed.response;

    try {
        const found = await recordScan(authed.claims.userId, parsed.data.barcode, {
            activeProfileId: readProfileHeader(request),
        });
        return found ? apiOk({ ok: true }, 201) : serviceError("not_found");
    } catch (error) {
        console.error("v1 record scan error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
