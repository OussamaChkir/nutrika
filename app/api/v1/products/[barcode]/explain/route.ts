import { AiServiceError, getAiConfig } from "@/lib/ai";
import { getCachedExplanation } from "@/lib/ai-cache";
import { generateExplanation } from "@/lib/ai-explain";
import { prisma } from "@/lib/db";
import { apiError, apiOk, authenticate, parseBody, serviceError } from "@/lib/mobile/http";
import { RATE_RULES } from "@/lib/mobile/rate-limit-db";
import { barcodeParam, explainBody } from "@/lib/mobile/schemas";
import { rateLimit } from "@/lib/mobile/sessions";

// The LLM can take a while to "think"; allow the platform to wait for it.
export const maxDuration = 60;

type Ctx = { params: Promise<{ barcode: string }> };

// POST /api/v1/products/{barcode}/explain – { locale?: "en" | "fr" }: a plain-language explanation of the
// score. A cached explanation is returned right away and costs nothing; a new one needs the AI service
// and counts against 10 per hour per user. Send `{}` for the default language. 503 `not_configured` when the
// AI service is not set up, 503 `unavailable` when it failed.
export async function POST(request: Request, { params }: Ctx) {
    const authed = await authenticate(request);
    if ("response" in authed) return authed.response;
    const { barcode } = await params;
    if (!barcodeParam.safeParse(barcode).success) return apiError(400, "invalid_request", "Invalid barcode.");
    const parsed = await parseBody(request, explainBody);
    if ("response" in parsed) return parsed.response;
    const { locale } = parsed.data;

    try {
        const product = await prisma.product.findUnique({ where: { barcode } });
        if (!product || product.status !== "APPROVED") return serviceError("not_found");

        const cached = await getCachedExplanation(product.id, locale, product.score);
        if (cached) return apiOk({ explanation: cached, cached: true });

        if (!getAiConfig()) return apiError(503, "not_configured", "Explanations are not available right now.");
        const limited = await rateLimit([{ rule: RATE_RULES.explainUser, callerKey: authed.claims.userId }]);
        if (!limited.allowed) return apiError(429, "rate_limited", "Too many explanations. Try again later.", { retryAfterSeconds: limited.retryAfterSeconds });

        const explanation = await generateExplanation(product, locale);
        return apiOk({ explanation, cached: false });
    } catch (error) {
        const kind = error instanceof AiServiceError ? error.kind : "unexpected";
        console.error(`v1 explanation failed (${kind}):`, error);
        return apiError(503, "unavailable", "Explanations are not available right now.");
    }
}
