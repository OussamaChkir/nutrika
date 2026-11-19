import { apiOk, authenticate, parseBody, requireFlag, serviceError } from "@/lib/mobile/http";
import { savedStateBody } from "@/lib/mobile/schemas";
import { clearProductStateFor, putProductStateFor } from "@/lib/shopping/service";

type Ctx = { params: Promise<{ barcode: string }> };

// PUT /api/v1/saved-products/{barcode} – { state: "approved" | "avoid" }. Idempotent: the app decides
// the new state (tapping the same button again is a DELETE), unlike the website's toggle.
export async function PUT(request: Request, { params }: Ctx) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const parsed = await parseBody(request, savedStateBody);
    if ("response" in parsed) return parsed.response;
    const { barcode } = await params;

    const result = await putProductStateFor(authed.claims.userId, barcode, parsed.data.state);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ state: result.state });
}

// DELETE /api/v1/saved-products/{barcode} – clears the state.
export async function DELETE(request: Request, { params }: Ctx) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { barcode } = await params;

    const result = await clearProductStateFor(authed.claims.userId, barcode);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ ok: true });
}
