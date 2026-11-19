import { apiOk, authenticate, requireFlag, serviceError } from "@/lib/mobile/http";
import { getSavedProducts } from "@/lib/shopping/service";

// GET /api/v1/saved-products – products the user marked "approved" or "avoid".
export async function GET(request: Request) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    try {
        return apiOk({ items: await getSavedProducts(authed.claims.userId) });
    } catch (error) {
        console.error("v1 saved products error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
