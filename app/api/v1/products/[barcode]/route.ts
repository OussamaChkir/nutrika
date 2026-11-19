import { loadProductDetail } from "@/lib/products/load-detail";
import { apiError, apiOk, authenticate, serviceError } from "@/lib/mobile/http";
import { readProfileHeader } from "@/lib/mobile/profile-header";
import { barcodeParam } from "@/lib/mobile/schemas";

export const runtime = "nodejs";
export const maxDuration = 30; // the first scan of a product also asks Open Food Facts

type Ctx = { params: Promise<{ barcode: string }> };

// GET /api/v1/products/{barcode}?locale=en|fr – the scan result: score, positives and negatives,
// allergens, nutrients, the verdict for the active profile (X-Profile-Id), the user's approve/avoid
// state and flags, and additive explanations. Adds the product to the catalogue the first time it is
// seen. It does NOT record a scan: the app calls POST /scan-history when the user opens the result.
// Texts are message keys + params; the app translates them with the website's message files.
export async function GET(request: Request, { params }: Ctx) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { barcode } = await params;
    if (!barcodeParam.safeParse(barcode).success) return apiError(400, "invalid_request", "Invalid barcode.");

    const locale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";

    try {
        const detail = await loadProductDetail(barcode, {
            userId: authed.claims.userId,
            isAdmin: authed.claims.role === "ADMIN",
            activeProfileId: readProfileHeader(request),
            locale,
        });
        return detail ? apiOk({ product: detail }) : serviceError("not_found");
    } catch (error) {
        console.error("v1 product error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
