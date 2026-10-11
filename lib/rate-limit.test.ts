import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
    it("allows up to the limit, then blocks until the window resets", () => {
        let now = 0;
        const limiter = createRateLimiter(2, 1000, () => now);

        expect(limiter.take("u1")).toBe(true);
        expect(limiter.take("u1")).toBe(true);
        expect(limiter.take("u1")).toBe(false);

        now = 999;
        expect(limiter.take("u1")).toBe(false);
        now = 1000;
        expect(limiter.take("u1")).toBe(true);
    });

    it("tracks each key separately", () => {
        const limiter = createRateLimiter(1, 1000, () => 0);
        expect(limiter.take("a")).toBe(true);
        expect(limiter.take("b")).toBe(true);
        expect(limiter.take("a")).toBe(false);
    });
});
