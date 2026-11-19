import { setFavoriteFor } from "@/lib/favorites/service";
import { apiOk, authenticate, serviceError } from "@/lib/mobile/http";
import { barcodeParam } from "@/lib/mobile/schemas";

type Ctx = { params: Promise<{ barcode: string }> };

async function handle(request: Request, { params }: Ctx, on: boolean) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { barcode } = await params;
    if (!barcodeParam.safeParse(barcode).success) return serviceError("invalid");

    try {
        const found = await setFavoriteFor(authed.claims.userId, barcode, on);
        return found ? apiOk({ isFavorite: on }) : serviceError("not_found");
    } catch (error) {
        console.error("v1 favorite error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}

// PUT /api/v1/favorites/{barcode} – add (idempotent). DELETE – remove (idempotent).
export const PUT = (request: Request, ctx: Ctx) => handle(request, ctx, true);
export const DELETE = (request: Request, ctx: Ctx) => handle(request, ctx, false);
