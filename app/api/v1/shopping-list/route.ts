import { remainingCount, sortItems } from "@/lib/shopping/list";
import { getShoppingList } from "@/lib/shopping/service";
import { apiOk, authenticate, requireFlag, serviceError } from "@/lib/mobile/http";

// GET /api/v1/shopping-list – still to buy first, bought items last.
export async function GET(request: Request) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    try {
        const items = sortItems(await getShoppingList(authed.claims.userId));
        return apiOk({ items, remaining: remainingCount(items) });
    } catch (error) {
        console.error("v1 shopping list error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
