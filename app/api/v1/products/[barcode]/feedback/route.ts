import { deleteFeedback, getFeedbackSummary, saveFeedback } from "@/lib/feedback/service";
import { apiError, apiOk, authenticate, parseBody, serviceError } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { barcodeParam, feedbackBody } from "@/lib/mobile/schemas";
import { rateLimit } from "@/lib/mobile/sessions";

type Ctx = { params: Promise<{ barcode: string }> };

async function guard(request: Request, params: Ctx["params"]) {
    const authed = await authenticate(request);
    if ("response" in authed) return { response: authed.response };
    const { barcode } = await params;
    if (!barcodeParam.safeParse(barcode).success) return { response: apiError(400, "invalid_request", "Invalid barcode.") };
    return { userId: authed.claims.userId, barcode };
}

// GET /api/v1/products/{barcode}/feedback – { average, count, mine }. Other people's comments are not
// exposed to the app, and the app cannot send a comment (stars only).
export async function GET(request: Request, { params }: Ctx) {
    const g = await guard(request, params);
    if ("response" in g) return g.response;
    try {
        const summary = await getFeedbackSummary(g.userId, g.barcode);
        return summary ? apiOk(summary) : serviceError("not_found");
    } catch (error) {
        console.error("v1 feedback read error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}

// PUT /api/v1/products/{barcode}/feedback – { rating: 1-5 }. One rating per user: replaces the previous.
export async function PUT(request: Request, { params }: Ctx) {
    const g = await guard(request, params);
    if ("response" in g) return g.response;
    const limited = await rateLimit([{ rule: RATE_RULES.feedbackUser, callerKey: g.userId }]);
    if (!limited.allowed) return apiError(429, "rate_limited", "Too many attempts. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });
    const parsed = await parseBody(request, feedbackBody);
    if ("response" in parsed) return parsed.response;

    try {
        const saved = await saveFeedback(g.userId, g.barcode, parsed.data);
        if (!saved) return serviceError("not_found");
        return apiOk(await getFeedbackSummary(g.userId, g.barcode));
    } catch (error) {
        console.error("v1 feedback save error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}

// DELETE /api/v1/products/{barcode}/feedback – removes the user's own rating.
export async function DELETE(request: Request, { params }: Ctx) {
    const g = await guard(request, params);
    if ("response" in g) return g.response;
    try {
        const done = await deleteFeedback(g.userId, g.barcode);
        return done ? apiOk({ ok: true }) : serviceError("not_found");
    } catch (error) {
        console.error("v1 feedback delete error:", error instanceof Error ? error.message : "unknown error");
        return serviceError("failed");
    }
}
