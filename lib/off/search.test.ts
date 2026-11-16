import { describe, expect, it, vi } from "vitest";

import { buildCandidateUrl, fetchAlternativeCandidates, isOffTag } from "./search";

const okResponse = (products: unknown) => ({ ok: true, status: 200, json: async () => ({ products }) }) as Response;

describe("isOffTag", () => {
    it.each(["en:tunisia", "en:breakfast-cereals", "fr:biscuits"])("accepts %s", (t) => expect(isOffTag(t)).toBe(true));
    it.each(["", "tunisia", "en:", "en:a b", "en:x&sort_by=evil", "EN:tunisia", "en:../etc"])("rejects %j", (t) =>
        expect(isOffTag(t)).toBe(false)
    );
});

describe("buildCandidateUrl", () => {
    it("asks only for the fields it needs, with a page size and category", () => {
        const url = new URL(buildCandidateUrl({ category: "en:chocolate-spreads" })!);
        expect(url.searchParams.get("categories_tags")).toBe("en:chocolate-spreads");
        expect(url.searchParams.get("fields")).toContain("nutriments");
        expect(url.searchParams.get("fields")).not.toContain("ingredients_analysis,"); // no bulk payload
        expect(Number(url.searchParams.get("page_size"))).toBeLessThanOrEqual(50);
        expect(url.searchParams.has("countries_tags")).toBe(false);
    });

    it("adds the country when given", () => {
        const url = new URL(buildCandidateUrl({ category: "en:biscuits", country: "en:tunisia" })!);
        expect(url.searchParams.get("countries_tags")).toBe("en:tunisia");
    });

    it("refuses anything that is not an OFF tag (no query injection)", () => {
        expect(buildCandidateUrl({ category: "en:biscuits&json=0" })).toBeNull();
        expect(buildCandidateUrl({ category: "en:biscuits", country: "tunisia&x=1" })).toBeNull();
    });
});

describe("fetchAlternativeCandidates", () => {
    it("returns the products and sends a descriptive User-Agent", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse([{ code: "1" }, { code: "2" }]));
        const out = await fetchAlternativeCandidates({ category: "en:biscuits" }, fetchImpl);
        expect(out.map((p) => p.code)).toEqual(["1", "2"]);
        const init = fetchImpl.mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^Nutrika\//);
    });

    it("drops malformed entries", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse([{ code: "1" }, null, { name: "no code" }, { code: 5 }]));
        expect((await fetchAlternativeCandidates({ category: "en:biscuits" }, fetchImpl)).map((p) => p.code)).toEqual(["1"]);
    });

    it("never calls the network for an invalid tag", async () => {
        const fetchImpl = vi.fn();
        expect(await fetchAlternativeCandidates({ category: "bad tag" }, fetchImpl)).toEqual([]);
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("retries once after a network error, then succeeds", async () => {
        const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(okResponse([{ code: "1" }]));
        expect(await fetchAlternativeCandidates({ category: "en:biscuits" }, fetchImpl)).toHaveLength(1);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("gives up after two failures and returns an empty list instead of throwing", async () => {
        const fetchImpl = vi.fn().mockRejectedValue(new Error("down"));
        expect(await fetchAlternativeCandidates({ category: "en:biscuits" }, fetchImpl)).toEqual([]);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("does not retry when rate limited", async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response);
        expect(await fetchAlternativeCandidates({ category: "en:biscuits" }, fetchImpl)).toEqual([]);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("tolerates a response without products", async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
        expect(await fetchAlternativeCandidates({ category: "en:biscuits" }, fetchImpl)).toEqual([]);
    });
});
