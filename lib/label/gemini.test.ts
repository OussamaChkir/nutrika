import { describe, expect, it, vi } from "vitest";

import { buildRequest, extractLabel, isValidModelName, parseModelJson } from "./gemini";

const goodJson = {
    productName: "Biscuit",
    kind: "food",
    readable: "good",
    confidence: 0.9,
    ingredientsText: "Farine, sucre",
    ingredientsComplete: true,
    allergensContains: ["gluten"],
    allergensMayContain: ["arachides"],
    nutrition: { basis: "per100g", sugars: 20, salt: 0.5 },
};

const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const textReply = (text: string) => reply({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] });
const input = (fetchImpl: typeof fetch) => ({ imageBase64: "AAAA", mimeType: "image/jpeg", apiKey: "KEY", model: "gemini-test-1", fetchImpl });

describe("request", () => {
    it("sends the image inline, asks for JSON, and keeps the key in a header (not the URL)", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(textReply(JSON.stringify(goodJson)));
        await extractLabel(input(fetchImpl as unknown as typeof fetch));
        const [url, init] = fetchImpl.mock.calls[0];
        expect(String(url)).toContain("/models/gemini-test-1:generateContent");
        expect(String(url)).not.toContain("KEY");
        expect(init.headers["x-goog-api-key"]).toBe("KEY");
        const body = JSON.parse(init.body);
        expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: "image/jpeg", data: "AAAA" });
        expect(body.generationConfig.responseMimeType).toBe("application/json");
        expect(buildRequest({ imageBase64: "x", mimeType: "image/png" }).systemInstruction.parts[0].text).toMatch(/DATA/);
    });
});

describe("answers", () => {
    it("parses a good answer and normalizes it", async () => {
        const r = await extractLabel(input(vi.fn().mockResolvedValue(textReply(JSON.stringify(goodJson))) as unknown as typeof fetch));
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.extraction.form.allergensMayContain).toEqual(["arachides"]);
            expect(r.extraction.form.ingredientsComplete).toBe(true);
        }
    });

    it("accepts JSON wrapped in a code fence", async () => {
        const r = await extractLabel(input(vi.fn().mockResolvedValue(textReply("```json\n" + JSON.stringify(goodJson) + "\n```")) as unknown as typeof fetch));
        expect(r.ok).toBe(true);
    });

    it("bad_output when the text is not JSON or empty", async () => {
        const notJson = await extractLabel(input(vi.fn().mockResolvedValue(textReply("Sorry, I cannot")) as unknown as typeof fetch));
        expect(notJson).toEqual({ ok: false, error: "bad_output" });
        const empty = await extractLabel(input(vi.fn().mockResolvedValue(reply({ candidates: [] })) as unknown as typeof fetch));
        expect(empty).toEqual({ ok: false, error: "bad_output" });
    });

    it("blocked when Google's filter refuses", async () => {
        const a = await extractLabel(input(vi.fn().mockResolvedValue(reply({ promptFeedback: { blockReason: "SAFETY" } })) as unknown as typeof fetch));
        expect(a).toEqual({ ok: false, error: "blocked" });
        const b = await extractLabel(input(vi.fn().mockResolvedValue(reply({ candidates: [{ finishReason: "SAFETY" }] })) as unknown as typeof fetch));
        expect(b).toEqual({ ok: false, error: "blocked" });
    });
});

describe("errors", () => {
    it.each([
        [429, "busy"],
        [503, "busy"],
        [400, "config"],
        [401, "config"],
        [403, "config"],
        [404, "config"],
    ])("maps HTTP %i to %s", async (status, code) => {
        const r = await extractLabel(input(vi.fn().mockResolvedValue(reply({}, status)) as unknown as typeof fetch));
        expect(r).toEqual({ ok: false, error: code });
    });

    it("maps a network failure and a timeout", async () => {
        const net = await extractLabel(input(vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch));
        expect(net).toEqual({ ok: false, error: "network" });
        const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
        const t = await extractLabel(input(vi.fn().mockRejectedValue(abort) as unknown as typeof fetch));
        expect(t).toEqual({ ok: false, error: "timeout" });
    });

    it("refuses a suspicious model name without calling the network", async () => {
        const fetchImpl = vi.fn();
        const r = await extractLabel({ ...input(fetchImpl as unknown as typeof fetch), model: "../evil?x=1" });
        expect(r).toEqual({ ok: false, error: "config" });
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});

describe("helpers", () => {
    it("validates model names", () => {
        expect(isValidModelName("gemini-2.5-flash-lite")).toBe(true);
        expect(isValidModelName("")).toBe(false);
        expect(isValidModelName("a/b")).toBe(false);
        expect(isValidModelName("x y z")).toBe(false);
    });

    it("parseModelJson strips fences", () => {
        expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    });
});
