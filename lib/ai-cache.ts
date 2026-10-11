import type { Prisma } from "@prisma/client";

import {
    EXPECTED_PROMPT_VERSION,
    explanationSchema,
    isCacheValid,
    toExplanation,
    type AiLocale,
    type Explanation,
    type ServiceResponse,
} from "./ai";
import { prisma } from "./db";

/** Returns the stored explanation, or null if there is none or it is stale. */
export async function getCachedExplanation(
    productId: string,
    locale: AiLocale,
    currentScore: number
): Promise<Explanation | null> {
    const row = await prisma.productExplanation.findUnique({
        where: {
            productId_locale_promptVersion: {
                productId,
                locale,
                promptVersion: EXPECTED_PROMPT_VERSION,
            },
        },
    });
    if (!row || !isCacheValid(row, currentScore)) return null;

    const highlights = explanationSchema.shape.highlights.safeParse(row.highlights);
    if (!highlights.success) return null;

    return {
        summary: row.summary,
        highlights: highlights.data,
        swapTip: row.swapTip,
        model: row.model,
    };
}

/** Stores a real LLM answer. Callers must not pass the service's fallback template. */
export async function saveExplanation(
    productId: string,
    locale: AiLocale,
    score: number,
    response: ServiceResponse
): Promise<void> {
    const explanation = toExplanation(response);
    const data = {
        score,
        summary: explanation.summary,
        highlights: explanation.highlights as Prisma.InputJsonValue,
        swapTip: explanation.swapTip,
        model: explanation.model,
    };

    await prisma.productExplanation.upsert({
        where: {
            productId_locale_promptVersion: {
                productId,
                locale,
                promptVersion: EXPECTED_PROMPT_VERSION,
            },
        },
        create: { productId, locale, promptVersion: EXPECTED_PROMPT_VERSION, ...data },
        update: data,
    });
}
