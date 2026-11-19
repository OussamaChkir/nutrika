import { apiOk, authenticate, parseBody, requireFlag, serviceError } from "@/lib/mobile/http";
import { shoppingPatchBody } from "@/lib/mobile/schemas";
import { removeListItemFor, setItemCheckedFor, setItemQuantityFor } from "@/lib/shopping/service";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/v1/shopping-list/items/{id} – { quantity?, checked? }.
export async function PATCH(request: Request, { params }: Ctx) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const parsed = await parseBody(request, shoppingPatchBody);
    if ("response" in parsed) return parsed.response;
    const { id } = await params;
    const userId = authed.claims.userId;

    if (parsed.data.quantity !== undefined) {
        const result = await setItemQuantityFor(userId, id, parsed.data.quantity);
        if (!result.ok) return serviceError(result.error);
    }
    if (parsed.data.checked !== undefined) {
        const result = await setItemCheckedFor(userId, id, parsed.data.checked);
        if (!result.ok) return serviceError(result.error);
    }
    return apiOk({ ok: true });
}

// DELETE /api/v1/shopping-list/items/{id}
export async function DELETE(request: Request, { params }: Ctx) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { id } = await params;

    const result = await removeListItemFor(authed.claims.userId, id);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ ok: true });
}
