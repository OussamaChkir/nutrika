import { apiOk, authenticate, parseBody, requireFlag, serviceError } from "@/lib/mobile/http";
import { shoppingAddBody } from "@/lib/mobile/schemas";
import { addFreeTextToListFor, addProductToListFor, clearCheckedItemsFor } from "@/lib/shopping/service";

// POST /api/v1/shopping-list/items – { barcode } for a catalogue product, or { label, quantity? } for
// free text. Adding something already on the list raises its quantity instead of duplicating it.
export async function POST(request: Request) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const parsed = await parseBody(request, shoppingAddBody);
    if ("response" in parsed) return parsed.response;
    const { barcode, label, quantity } = parsed.data;

    const result = barcode
        ? await addProductToListFor(authed.claims.userId, barcode)
        : await addFreeTextToListFor(authed.claims.userId, { label: label ?? "", quantity });
    if (!result.ok) return serviceError(result.error);
    return apiOk({ item: result.item, firstItem: result.firstItem }, 201);
}

// DELETE /api/v1/shopping-list/items?checked=true – clears the bought items.
// The flag is required, so a stray DELETE can never empty the whole list.
export async function DELETE(request: Request) {
    const off = requireFlag("shoppingList");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    if (new URL(request.url).searchParams.get("checked") !== "true") {
        return serviceError("invalid");
    }

    const result = await clearCheckedItemsFor(authed.claims.userId);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ ok: true });
}
