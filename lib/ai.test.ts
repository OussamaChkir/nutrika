import { describe, expect, it, vi } from "vitest";

import {
    AiServiceError,
    EXPECTED_PROMPT_VERSION,
    buildExplainPayload,
    getAiConfig,
    isAiLocale,
    isCacheValid,
    isExplainableBarcode,
    requestExplanation,
    toExplanation,
    type ExplainableProduct,
} from "./ai";

const product = (overrides: Partial<ExplainableProduct> = {}): ExplainableProduct => ({
    barcode: "3017620422003",
    name: "Hazelnut spread",
    brand: "Example Brand",
    score: 32,
    scoreLetter: "D",
    positives: [{ key: "organicCertified" }],
    negatives: [{ key: "veryHighSugar", params: { value: "56.3" } }],
    allergens: ["milk", "nuts"],
    dietaryTags: ["Contains palm oil"],
    sugars: 56.3,
    saturatedFat: 10.6,
    fat: 30.9,
    carbohydrates: 57.5,
    fiber: null,
    proteins: 6.3,
    salt: 0.1,
    offData: { nova_group: 4, nutriscore_grade: "e", ingredients_text: "Sugar, palm oil, hazelnuts" },
    ...overrides,
});

// Stand-in for next-intl's ScoreMessages translator.
const t = (key: string, values?: Record<string, string | number>) =>
    `${key}${values ? `(${Object.values(values).join(",")})` : ""}`;

const goodResponse = {
    summary: "Ce produit obtient 32/100.",
    highlights: [{ topic: "Sucre", detail: "Très élevé.", tone: "negative" }],
    swap_tip: "Cherchez moins de sucre.",
    source: "llm",
    prompt_version: EXPECTED_PROMPT_VERSION,
    model: "gemini-test",
};

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("buildExplainPayload", () => {
    it("translates score aspects and maps product fields to the service schema", () => {
        const body = buildExplainPayload(product(), "fr", t);
        expect(body.locale).toBe("fr");
        expect(body.product).toMatchObject({
            barcode: "3017620422003",
            name: "Hazelnut spread",
            brand: "Example Brand",
            score: 32,
            grade: "D",
            positives: ["organicCertified"],
            negatives: ["veryHighSugar(56.3)"],
            allergens: ["milk", "nuts"],
            nova_group: 4,
            nutriscore_grade: "E",
            ingredients_text: "Sugar, palm oil, hazelnuts",
        });
        expect(body.product.nutrition).toEqual({
            sugars: 56.3,
            saturated_fat: 10.6,
            fat: 30.9,
            carbohydrates: 57.5,
            proteins: 6.3,
            salt: 0.1,
        });
    });

    it("never sends the user's allergies, so the result can be shared and cached", () => {
        expect(buildExplainPayload(product(), "en", t).user).toEqual({ allergies: [] });
    });

    it("does not send energy (the database mixes kJ and kcal)", () => {
        const body = buildExplainPayload(product(), "en", t);
        expect(Object.keys(body.product.nutrition)).not.toContain("energy");
        expect(Object.keys(body.product.nutrition)).not.toContain("energy_kcal");
    });

    it("omits missing nutrition values instead of sending nulls", () => {
        const body = buildExplainPayload(
            product({ sugars: null, saturatedFat: null, fat: null, carbohydrates: null, proteins: null, salt: null }),
            "en",
            t
        );
        expect(body.product.nutrition).toEqual({});
    });

    it("handles legacy aspects that only have English text", () => {
        const legacy = [{ text: "Some legacy text" }];
        expect(buildExplainPayload(product({ negatives: legacy }), "en", t).product.negatives).toEqual([
            "Some legacy text",
        ]);
    });

    it("works without any Open Food Facts data", () => {
        const body = buildExplainPayload(product({ offData: null }), "en", t);
        expect(body.product.nova_group).toBeNull();
        expect(body.product.nutriscore_grade).toBeNull();
        expect(body.product.ingredients_text).toBeNull();
    });

    it("clamps and trims values to the service's limits", () => {
        const body = buildExplainPayload(
            product({
                name: "x".repeat(500),
                brand: "y".repeat(500),
                score: 130,
                offData: { ingredients_text: "z".repeat(9000), nova_group: 9 },
                allergens: Array.from({ length: 50 }, (_, i) => `a${i}`),
            }),
            "en",
            t
        );
        expect(body.product.name).toHaveLength(200);
        expect(body.product.brand).toHaveLength(120);
        expect(body.product.score).toBe(100);
        expect(body.product.ingredients_text).toHaveLength(4000);
        expect(body.product.nova_group).toBeNull();
        expect(body.product.allergens).toHaveLength(30);
    });
});

describe("small helpers", () => {
    it("accepts only 6 to 14 digit barcodes", () => {
        expect(isExplainableBarcode("3017620422003")).toBe(true);
        expect(isExplainableBarcode("12345")).toBe(false);
        expect(isExplainableBarcode("ABC12345")).toBe(false);
        expect(isExplainableBarcode("123456789012345")).toBe(false);
    });

    it("validates locales", () => {
        expect(isAiLocale("fr")).toBe(true);
        expect(isAiLocale("ar")).toBe(false);
    });

    it("treats a cache row as stale when the score or prompt version changed", () => {
        expect(isCacheValid({ score: 32, promptVersion: EXPECTED_PROMPT_VERSION }, 32)).toBe(true);
        expect(isCacheValid({ score: 32, promptVersion: EXPECTED_PROMPT_VERSION }, 40)).toBe(false);
        expect(isCacheValid({ score: 32, promptVersion: "explain-v0" }, 32)).toBe(false);
    });

    it("reads config from the environment and strips trailing slashes", () => {
        expect(getAiConfig({})).toBeNull();
        expect(getAiConfig({ NUTRIKA_AI_URL: "  " })).toBeNull();
        expect(getAiConfig({ NUTRIKA_AI_URL: "http://localhost:8000//", NUTRIKA_AI_KEY: "k" })).toEqual({
            url: "http://localhost:8000",
            apiKey: "k",
        });
        expect(getAiConfig({ NUTRIKA_AI_URL: "http://x" })?.apiKey).toBeNull();
    });
});

describe("requestExplanation", () => {
    const payload = buildExplainPayload(product(), "fr", t);
    const config = { url: "http://ai.test", apiKey: "secret" };

    it("posts to /v1/explain with the API key and returns the parsed LLM answer", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(goodResponse));
        const result = await requestExplanation(payload, { config, fetchImpl });

        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe("http://ai.test/v1/explain");
        expect((init as RequestInit).method).toBe("POST");
        expect((init as RequestInit).headers).toMatchObject({ "X-API-Key": "secret" });
        expect(JSON.parse((init as RequestInit).body as string).product.barcode).toBe("3017620422003");
        expect(toExplanation(result)).toEqual({
            summary: "Ce produit obtient 32/100.",
            highlights: [{ topic: "Sucre", detail: "Très élevé.", tone: "negative" }],
            swapTip: "Cherchez moins de sucre.",
            model: "gemini-test",
        });
    });

    it("omits the API key header when none is configured", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(goodResponse));
        await requestExplanation(payload, { config: { url: "http://ai.test", apiKey: null }, fetchImpl });
        expect((fetchImpl.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("X-API-Key");
    });

    const failure = async (run: () => Promise<unknown>) => {
        try {
            await run();
        } catch (error) {
            return error as AiServiceError;
        }
        throw new Error("expected a failure");
    };

    it("reports a missing configuration", async () => {
        const error = await failure(() => requestExplanation(payload, { config: null }));
        expect(error).toBeInstanceOf(AiServiceError);
        expect(error.kind).toBe("not_configured");
    });

    it("reports an unreachable service", async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
        expect((await failure(() => requestExplanation(payload, { config, fetchImpl }))).kind).toBe("unreachable");
    });

    it("reports non-200 answers (for example 401 or 422)", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ detail: "nope" }, 401));
        expect((await failure(() => requestExplanation(payload, { config, fetchImpl }))).kind).toBe("bad_response");
    });

    it("rejects answers that do not match the contract", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ hello: "world" }));
        expect((await failure(() => requestExplanation(payload, { config, fetchImpl }))).kind).toBe("bad_response");
    });

    it("refuses the service's templated fallback so it is never cached as an AI answer", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ...goodResponse, source: "fallback" }));
        expect((await failure(() => requestExplanation(payload, { config, fetchImpl }))).kind).toBe("fallback");
    });
});
