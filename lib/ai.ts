/**
 * Client for the nutrika-ai service (https://github.com/OussamaChkir/nutrika-ai).
 *
 * Everything in this file is pure or uses only `fetch`, so it can be unit-tested without
 * a database. Database access for the cache lives in `lib/ai-cache.ts`.
 *
 * Design rules:
 *  - The LLM only explains facts Nutrika already computed in `lib/scoring.ts`.
 *  - The explanation is NOT personalised (no user allergies are sent), so one cached row
 *    can serve every user. Allergy warnings stay deterministic on the product page.
 *  - Only real LLM answers are used. The service's templated fallback is treated as "unavailable".
 */
import { z } from "zod";

import { resolveScoreAspectMessage, type ScoreMessageTranslator } from "./score-messages";
import type { ScoreAspect } from "./scoring";

// ============================================
// CONFIG
// ============================================

/** Must match PROMPT_VERSION in nutrika-ai/app/prompts.py. Bump both together. */
export const EXPECTED_PROMPT_VERSION = "explain-v1";

/** Locales the AI service can write in. Nutrika currently ships "en" and "fr". */
export const AI_LOCALES = ["en", "fr"] as const;
export type AiLocale = (typeof AI_LOCALES)[number];

/** The service answers in about 3 to 25 s depending on the model's "thinking". */
export const AI_REQUEST_TIMEOUT_MS = 40_000;

export function isAiLocale(value: string): value is AiLocale {
    return (AI_LOCALES as readonly string[]).includes(value);
}

export function getAiConfig(env: Record<string, string | undefined> = process.env) {
    const url = env.NUTRIKA_AI_URL?.trim().replace(/\/+$/, "");
    if (!url) return null;
    return { url, apiKey: env.NUTRIKA_AI_KEY?.trim() || null };
}

// ============================================
// TYPES
// ============================================

/** The subset of the Prisma `Product` model needed to build a request. */
export interface ExplainableProduct {
    barcode: string;
    name: string;
    brand: string | null;
    score: number;
    scoreLetter: string;
    positives: ScoreAspect[];
    negatives: ScoreAspect[];
    allergens: string[];
    dietaryTags: string[];
    sugars: number | null;
    saturatedFat: number | null;
    fat: number | null;
    carbohydrates: number | null;
    fiber: number | null;
    proteins: number | null;
    salt: number | null;
    /** Raw Open Food Facts payload cached on the product, if any. */
    offData: Record<string, unknown> | null;
}

const toneSchema = z.enum(["positive", "neutral", "negative"]);

export const explanationSchema = z.object({
    summary: z.string().min(1),
    highlights: z.array(z.object({ topic: z.string(), detail: z.string(), tone: toneSchema })),
    swap_tip: z.string().nullable().optional(),
});

/** What the service returns, trimmed to the fields Nutrika relies on. */
export const serviceResponseSchema = explanationSchema.extend({
    source: z.enum(["llm", "fallback"]),
    prompt_version: z.string(),
    model: z.string().nullable().optional(),
});

export type ServiceResponse = z.infer<typeof serviceResponseSchema>;

/** The shape stored in the cache and sent to the browser. */
export interface Explanation {
    summary: string;
    highlights: { topic: string; detail: string; tone: "positive" | "neutral" | "negative" }[];
    swapTip: string | null;
    model: string | null;
}

export class AiServiceError extends Error {
    constructor(
        message: string,
        readonly kind: "not_configured" | "unreachable" | "bad_response" | "fallback"
    ) {
        super(message);
        this.name = "AiServiceError";
    }
}

// ============================================
// PURE HELPERS
// ============================================

/** Same rule as the service (6 to 14 digits). Nutrika itself only stores 8 to 14. */
export function isExplainableBarcode(barcode: string): boolean {
    return /^\d{6,14}$/.test(barcode);
}

const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

function numberOrUndefined(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Build the request body for `POST /v1/explain`.
 *
 * `t` is next-intl's ScoreMessages translator for the target locale, so the facts the
 * LLM sees ("Very high sugar (56.3g/100g)") are already in the user's language.
 * `energy` is deliberately not sent: the Prisma field mixes kJ and kcal.
 */
export function buildExplainPayload(
    product: ExplainableProduct,
    locale: AiLocale,
    t: ScoreMessageTranslator
) {
    const text = (aspects: ScoreAspect[]) =>
        aspects
            .map((a) => resolveScoreAspectMessage(a, t))
            .filter(Boolean)
            .slice(0, 20);

    const off = product.offData ?? {};
    const ingredients =
        (typeof off.ingredients_text === "string" && off.ingredients_text) ||
        (typeof off.ingredients_text_en === "string" && off.ingredients_text_en) ||
        undefined;
    const nova = numberOrUndefined(off.nova_group);
    const nutriscore =
        typeof off.nutriscore_grade === "string" ? off.nutriscore_grade.toUpperCase() : undefined;

    const nutrition = Object.fromEntries(
        Object.entries({
            sugars: product.sugars,
            saturated_fat: product.saturatedFat,
            fat: product.fat,
            carbohydrates: product.carbohydrates,
            fiber: product.fiber,
            proteins: product.proteins,
            salt: product.salt,
        }).filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    );

    return {
        product: {
            barcode: product.barcode,
            name: clip(product.name, 200),
            brand: product.brand ? clip(product.brand, 120) : null,
            score: Math.max(0, Math.min(100, Math.round(product.score))),
            grade: product.scoreLetter,
            positives: text(product.positives),
            negatives: text(product.negatives),
            allergens: product.allergens.slice(0, 30),
            dietary_tags: product.dietaryTags.slice(0, 20),
            nova_group: nova !== undefined && nova >= 1 && nova <= 4 ? nova : null,
            nutriscore_grade: nutriscore && nutriscore.length <= 2 ? nutriscore : null,
            nutrition,
            ingredients_text: ingredients ? clip(ingredients, 4000) : null,
        },
        // Intentionally empty: explanations are shared across users (see file header).
        user: { allergies: [] as string[] },
        locale,
    };
}

/** A cached explanation is only valid for the same score and prompt version. */
export function isCacheValid(
    cached: { score: number; promptVersion: string },
    currentScore: number
): boolean {
    return cached.score === currentScore && cached.promptVersion === EXPECTED_PROMPT_VERSION;
}

export function toExplanation(response: ServiceResponse): Explanation {
    return {
        summary: response.summary,
        highlights: response.highlights,
        swapTip: response.swap_tip ?? null,
        model: response.model ?? null,
    };
}

// ============================================
// NETWORK
// ============================================

export async function requestExplanation(
    payload: ReturnType<typeof buildExplainPayload>,
    options: { config?: ReturnType<typeof getAiConfig>; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<ServiceResponse> {
    const config = options.config === undefined ? getAiConfig() : options.config;
    if (!config) throw new AiServiceError("NUTRIKA_AI_URL is not set", "not_configured");

    const doFetch = options.fetchImpl ?? fetch;
    let res: Response;
    try {
        res = await doFetch(`${config.url}/v1/explain`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(config.apiKey ? { "X-API-Key": config.apiKey } : {}),
            },
            body: JSON.stringify(payload),
            cache: "no-store",
            signal: AbortSignal.timeout(options.timeoutMs ?? AI_REQUEST_TIMEOUT_MS),
        });
    } catch (error) {
        throw new AiServiceError(`AI service unreachable: ${String(error)}`, "unreachable");
    }

    if (!res.ok) {
        throw new AiServiceError(`AI service returned HTTP ${res.status}`, "bad_response");
    }

    const parsed = serviceResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
        throw new AiServiceError("AI service returned an unexpected response", "bad_response");
    }
    if (parsed.data.source !== "llm") {
        throw new AiServiceError("AI service used its fallback template", "fallback");
    }
    return parsed.data;
}
