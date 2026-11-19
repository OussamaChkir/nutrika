import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_LOCALES, AiServiceError, getAiConfig } from "@/lib/ai";
import { generateExplanation } from "@/lib/ai-explain";
import { getCachedExplanation } from "@/lib/ai-cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";

// The LLM can take a while to "think"; allow the platform to wait for it.
export const maxDuration = 60;

// Generating costs money and free-tier quota: 10 new explanations per user per hour.
const limiter = createRateLimiter(10, 60 * 60 * 1000);

const bodySchema = z.object({
    barcode: z.string().regex(/^\d{6,14}$/),
    locale: z.enum(AI_LOCALES),
});

// POST /api/ai/explain – plain-language explanation of a product's score
export async function POST(request: Request) {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { barcode, locale } = body.data;

    const product = await prisma.product.findUnique({ where: { barcode } });
    if (!product || product.status !== "APPROVED") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Cached explanations are free to serve, so anyone may read them.
    const cached = await getCachedExplanation(product.id, locale, product.score);
    if (cached) {
        return NextResponse.json({ explanation: cached, cached: true });
    }

    // Generating a new one needs the service, a signed-in user, and quota.
    if (!getAiConfig()) {
        return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!limiter.take(session.user.id)) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    try {
        const explanation = await generateExplanation(product, locale);
        return NextResponse.json({ explanation, cached: false });
    } catch (error) {
        const kind = error instanceof AiServiceError ? error.kind : "unexpected";
        console.error(`AI explanation failed (${kind}):`, error);
        return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
}
