import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ prisma: {} }));

import { averageRating } from "./service";

describe("averageRating", () => {
    it("is null with no ratings", () => expect(averageRating([])).toBeNull());
    it("rounds to one decimal", () => {
        expect(averageRating([5, 4, 4])).toBe(4.3);
        expect(averageRating([1])).toBe(1);
        expect(averageRating([5, 5, 5, 5])).toBe(5);
    });
});
