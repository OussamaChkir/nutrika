import { describe, expect, it } from "vitest";

import { toMobileUser } from "./user";

const row = {
    id: "u1",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: null,
    image: null,
    role: "USER",
    passwordHash: "$2a$12$secret",
    createdAt: new Date("2026-01-02T03:04:05Z"),
    accounts: [{ provider: "google" }, { provider: "apple" }, { provider: "google" }],
};

describe("toMobileUser", () => {
    it("never exposes the password hash, only whether there is one", () => {
        const out = toMobileUser(row);
        expect(JSON.stringify(out)).not.toContain("secret");
        expect(out).not.toHaveProperty("passwordHash");
        expect(out.hasPassword).toBe(true);
    });

    it("lists each provider once, sorted, and formats dates", () => {
        const out = toMobileUser(row);
        expect(out.providers).toEqual(["apple", "google"]);
        expect(out.createdAt).toBe("2026-01-02T03:04:05.000Z");
        expect(out.emailVerified).toBe(false);
    });

    it("handles social-only accounts", () => {
        const out = toMobileUser({ ...row, passwordHash: null, emailVerified: new Date(), accounts: undefined });
        expect(out.hasPassword).toBe(false);
        expect(out.emailVerified).toBe(true);
        expect(out.providers).toEqual([]);
    });
});
