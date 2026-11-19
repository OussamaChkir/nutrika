import { deleteProfileFor, updateProfileFor } from "@/lib/profiles/service";
import { apiOk, authenticate, requireFlag, serviceError } from "@/lib/mobile/http";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/v1/profiles/{id} – replace a profile's fields (same body as create, consent required).
export async function PUT(request: Request, { params }: Ctx) {
    const off = requireFlag("personalScore");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const result = await updateProfileFor(authed.claims.userId, id, body);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ profile: result.profile, makeActive: result.makeActive });
}

// DELETE /api/v1/profiles/{id} – also deletes the scan records made with that profile.
export async function DELETE(request: Request, { params }: Ctx) {
    const off = requireFlag("personalScore");
    if (off) return off;
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { id } = await params;

    const result = await deleteProfileFor(authed.claims.userId, id);
    if (!result.ok) return serviceError(result.error);
    return apiOk({ ok: true });
}
