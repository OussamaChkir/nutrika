import { describe, expect, it } from "vitest";

import {
    ACCESS_TOKEN_TTL_SECONDS,
    decideRefresh,
    generateFamilyId,
    generateRefreshToken,
    hashRefreshToken,
    MissingSecretError,
    parseBearer,
    refreshTokenExpiry,
    REFRESH_TOKEN_TTL_DAYS,
    signAccessToken,
    verifyAccessToken,
} from "./tokens";

const SECRET = "test-secret-test-secret-test-secret";
const NOW = new Date("2026-11-18T10:00:00Z");

describe("access tokens", () => {
    it("round-trips user id and role", async () => {
        const { token, expiresIn } = await signAccessToken({ userId: "u1", role: "USER" }, { now: NOW, secret: SECRET });
        expect(expiresIn).toBe(ACCESS_TOKEN_TTL_SECONDS);
        expect(await verifyAccessToken(token, { now: NOW, secret: SECRET })).toEqual({ userId: "u1", role: "USER" });
    });

    it("rejects an expired token", async () => {
        const { token } = await signAccessToken({ userId: "u1", role: "USER" }, { now: NOW, secret: SECRET });
        const later = new Date(NOW.getTime() + (ACCESS_TOKEN_TTL_SECONDS + 1) * 1000);
        expect(await verifyAccessToken(token, { now: later, secret: SECRET })).toBeNull();
    });

    it("accepts a token that is still valid just before expiry", async () => {
        const { token } = await signAccessToken({ userId: "u1", role: "USER" }, { now: NOW, secret: SECRET });
        const almost = new Date(NOW.getTime() + (ACCESS_TOKEN_TTL_SECONDS - 1) * 1000);
        expect(await verifyAccessToken(token, { now: almost, secret: SECRET })).not.toBeNull();
    });

    it("rejects a token signed with another secret", async () => {
        const { token } = await signAccessToken({ userId: "u1", role: "ADMIN" }, { now: NOW, secret: "another-secret-another-secret-1234" });
        expect(await verifyAccessToken(token, { now: NOW, secret: SECRET })).toBeNull();
    });

    it("rejects garbage and tampered tokens", async () => {
        expect(await verifyAccessToken("not-a-jwt", { now: NOW, secret: SECRET })).toBeNull();
        const { token } = await signAccessToken({ userId: "u1", role: "USER" }, { now: NOW, secret: SECRET });
        const [h, , s] = token.split(".");
        const forgedPayload = Buffer.from(JSON.stringify({ sub: "u1", role: "ADMIN", iss: "nutrika", aud: "nutrika-mobile" })).toString("base64url");
        expect(await verifyAccessToken(`${h}.${forgedPayload}.${s}`, { now: NOW, secret: SECRET })).toBeNull();
    });

    it("throws when no secret is configured instead of accepting everything", async () => {
        await expect(signAccessToken({ userId: "u1", role: "USER" }, { secret: "short" })).rejects.toBeInstanceOf(MissingSecretError);
    });
});

describe("refresh tokens", () => {
    it("generates unique prefixed tokens and stores only the hash", () => {
        const a = generateRefreshToken();
        const b = generateRefreshToken();
        expect(a.token).toMatch(/^nrt_[A-Za-z0-9_-]{40,}$/);
        expect(a.token).not.toBe(b.token);
        expect(a.tokenHash).toBe(hashRefreshToken(a.token));
        expect(a.tokenHash).not.toContain(a.token);
        expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("expires after the configured number of days", () => {
        const expiry = refreshTokenExpiry(NOW);
        expect((expiry.getTime() - NOW.getTime()) / 86_400_000).toBe(REFRESH_TOKEN_TTL_DAYS);
    });

    it("makes distinct family ids", () => {
        expect(generateFamilyId()).not.toBe(generateFamilyId());
    });
});

describe("decideRefresh", () => {
    const valid = { expiresAt: new Date(NOW.getTime() + 1000), revokedAt: null };

    it("accepts a live token", () => expect(decideRefresh(valid, NOW)).toBe("ok"));
    it("reports an unknown token", () => expect(decideRefresh(null, NOW)).toBe("unknown"));
    it("reports an expired token (the boundary counts as expired)", () => {
        expect(decideRefresh({ expiresAt: NOW, revokedAt: null }, NOW)).toBe("expired");
    });
    it("treats a revoked token as reuse, even if it has also expired", () => {
        expect(decideRefresh({ ...valid, revokedAt: new Date(NOW.getTime() - 1) }, NOW)).toBe("reuse");
        expect(decideRefresh({ expiresAt: new Date(0), revokedAt: new Date(1) }, NOW)).toBe("reuse");
    });
});

describe("parseBearer", () => {
    it("extracts the token", () => {
        expect(parseBearer("Bearer abc.def.ghi")).toBe("abc.def.ghi");
        expect(parseBearer("bearer   abc")).toBe("abc");
    });
    it("returns null for anything else", () => {
        expect(parseBearer(null)).toBeNull();
        expect(parseBearer("")).toBeNull();
        expect(parseBearer("Basic abc")).toBeNull();
        expect(parseBearer("Bearer")).toBeNull();
        expect(parseBearer("Bearer a b")).toBeNull();
    });
});
