import { listFavoritesFor } from "@/lib/favorites/service";
import { apiOk, authenticate, serviceError } from "@/lib/mobile/http";

// GET /api/v1/favorites – favorite products, newest first.
export async function GET(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    try {
        return apiOk({ items: await listFavoritesFor(authed.claims.userId) });
    } catch (error) {
        console.error("v1 favorites error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
