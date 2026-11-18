import { loadAccountExport } from "@/lib/account-export";
import { apiError, apiOk, authenticate } from "@/lib/mobile/http";

// GET /api/v1/me/export – everything we hold about the signed-in user, as JSON (GDPR access/portability).
export async function GET(request: Request) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;

    try {
        const body = await loadAccountExport(authed.claims.userId);
        if (!body) return apiError(404, "not_found", "Account not found.");
        return apiOk(body);
    } catch (error) {
        console.error("v1 export error:", error);
        return apiError(500, "server_error", "Something went wrong. Please try again.");
    }
}
