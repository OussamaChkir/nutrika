import { loadAlternatives } from "@/lib/products/alternatives";
import { apiError, apiOk, authenticate, requireFlag, serviceError } from "@/lib/mobile/http";
import { readProfileHeader } from "@/lib/mobile/profile-header";
import { barcodeParam } from "@/lib/mobile/schemas";

export const runtime = "nodejs";
export const maxDuration = 30; // asks Open Food Facts for candidates

type Ctx = { params: Promise<{ barcode: string }> };

// GET /api/v1/products/{barcode}/alternatives – better products in the same category (flag alternatives).
// Ranked on the personal score of the profile in X-Profile-Id when there is one. If Open Food Facts is
// slow or down this answers 200 with no items rather than an error: it is a bonus, never a blocker.
export async function GET(request: Request, { params }: Ctx) {
    const off = requireFlag("alternatives");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { barcode } = await params;
    if (!barcodeParam.safeParse(barcode).success) return apiError(400, "invalid_request", "Invalid barcode.");

    try {
        const answer = await loadAlternatives(barcode, {
            userId: authed.claims.userId,
            isAdmin: authed.claims.role === "ADMIN",
            activeProfileId: readProfileHeader(request),
        });
        return answer ? apiOk(answer) : serviceError("not_found");
    } catch (error) {
        console.error("v1 alternatives error:", error instanceof Error ? error.message : "unknown error");
        return apiOk({ offered: true, items: [], profileName: null, countryTag: null });
    }
}
