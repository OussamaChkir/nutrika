// F5: ask the Gemini API to read a label photo. Server only (it needs the API key).
//
// No SDK: one fetch to the REST endpoint, so there is nothing to keep in sync. The model name is
// a setting (GEMINI_MODEL), because model names change and I could not verify a current one.
// Only responseMimeType is requested (no schema field): it works across model generations, and
// the answer is validated with Zod anyway.
//
// Nothing here stores the image, and nothing logs it or the extracted text.

import { normalizeExtraction } from "./normalize";
import { SYSTEM_PROMPT, USER_PROMPT } from "./prompt";
import { rawExtractionSchema, type Extraction } from "./schema";

export type ExtractErrorCode =
    | "busy" // rate limited or overloaded on Google's side: try again later
    | "config" // bad key, unknown model, or a request Google refuses: our setup problem
    | "blocked" // Google's safety filter refused the image
    | "bad_output" // the answer was not the JSON we asked for
    | "network"
    | "timeout";

export type ExtractResult = { ok: true; extraction: Extraction } | { ok: false; error: ExtractErrorCode };

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
export const REQUEST_TIMEOUT_MS = 25_000;

export interface ExtractInput {
    imageBase64: string;
    mimeType: string;
    apiKey: string;
    model: string;
    fetchImpl?: typeof fetch;
}

/** Models are named like "gemini-something-1.5": letters, digits, dots, dashes. Anything else is refused. */
export const isValidModelName = (name: string) => /^[a-z0-9][a-z0-9.\-]{2,60}$/i.test(name);

export function buildRequest({ imageBase64, mimeType }: Pick<ExtractInput, "imageBase64" | "mimeType">) {
    return {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: USER_PROMPT }, { inlineData: { mimeType, data: imageBase64 } }] }],
        generationConfig: { responseMimeType: "application/json" },
    };
}

/** Pull the JSON out of the answer, tolerating a ```json fence. */
export function parseModelJson(text: string): unknown {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(trimmed);
}

interface GeminiResponse {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
}

export async function extractLabel(input: ExtractInput): Promise<ExtractResult> {
    const { apiKey, model, fetchImpl = fetch } = input;
    if (!isValidModelName(model)) return { ok: false, error: "config" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
        response = await fetchImpl(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(buildRequest(input)),
            signal: controller.signal,
        });
    } catch (error) {
        return { ok: false, error: error instanceof Error && error.name === "AbortError" ? "timeout" : "network" };
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        // 429 and 5xx: Google is busy. 400/401/403/404: our key, model or request is wrong.
        const busy = response.status === 429 || response.status >= 500;
        return { ok: false, error: busy ? "busy" : "config" };
    }

    let body: GeminiResponse;
    try {
        body = (await response.json()) as GeminiResponse;
    } catch {
        return { ok: false, error: "bad_output" };
    }

    if (body.promptFeedback?.blockReason) return { ok: false, error: "blocked" };
    const candidate = body.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (!text.trim()) return { ok: false, error: candidate?.finishReason === "SAFETY" ? "blocked" : "bad_output" };

    let json: unknown;
    try {
        json = parseModelJson(text);
    } catch {
        return { ok: false, error: "bad_output" };
    }
    const parsed = rawExtractionSchema.safeParse(json);
    if (!parsed.success) return { ok: false, error: "bad_output" };
    return { ok: true, extraction: normalizeExtraction(parsed.data) };
}
