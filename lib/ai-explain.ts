import { createTranslator } from "next-intl";

import { buildExplainPayload, requestExplanation, toExplanation, type AiLocale, type Explanation } from "./ai";
import { saveExplanation } from "./ai-cache";
import { parseScoreAspects } from "./score-messages";
import type { Product } from "@prisma/client";

// Generates a plain-language explanation of a product's score with the AI service, and caches it.
// Shared by POST /api/ai/explain (web) and POST /api/v1/products/{barcode}/explain (mobile).
// The callers check: product is APPROVED, AI is configured, the user is signed in, the rate limit.
// Throws AiServiceError (or another error) when the service fails; the caller answers 503.

async function scoreTranslator(locale: AiLocale) {
    const messages = (await import(`@/messages/${locale}.json`)).default;
    return createTranslator({ locale, messages, namespace: "ScoreMessages" }) as unknown as (
        key: string,
        values?: Record<string, string | number>
    ) => string;
}

export async function generateExplanation(product: Product, locale: AiLocale): Promise<Explanation> {
    const t = await scoreTranslator(locale);
    const payload = buildExplainPayload(
        {
            barcode: product.barcode,
            name: product.name,
            brand: product.brand,
            score: product.score,
            scoreLetter: product.scoreLetter,
            positives: parseScoreAspects(product.positives),
            negatives: parseScoreAspects(product.negatives),
            allergens: product.allergens,
            dietaryTags: product.dietaryTags,
            sugars: product.sugars,
            saturatedFat: product.saturatedFat,
            fat: product.fat,
            carbohydrates: product.carbohydrates,
            fiber: product.fiber,
            proteins: product.proteins,
            salt: product.salt,
            offData: (product.offData as Record<string, unknown> | null) ?? null,
        },
        locale,
        t
    );

    const response = await requestExplanation(payload);

    // A failed cache write must not hide a good answer from the user.
    await saveExplanation(product.id, locale, product.score, response).catch((error) =>
        console.error("Failed to cache AI explanation:", error)
    );

    return toExplanation(response);
}
