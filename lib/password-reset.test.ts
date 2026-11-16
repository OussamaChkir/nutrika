import { describe, it, expect } from "vitest";
import {
    RESET_REQUEST_COOLDOWN_SECONDS,
    RESET_TOKEN_TTL_MINUTES,
    buildResetUrl,
    generateResetToken,
    hashResetToken,
    isResetRequestThrottled,
    isResetTokenExpired,
    normalizeLocale,
    resetTokenExpiry,
} from "./password-reset";
import { buildResetPasswordEmail } from "./emails/reset-password";
import { resetPasswordSchema } from "./validators";

describe("reset token", () => {
    it("stores a hash that differs from the raw token", () => {
        const { token, tokenHash } = generateResetToken();
        expect(token).toHaveLength(64);
        expect(tokenHash).not.toBe(token);
        expect(hashResetToken(token)).toBe(tokenHash);
    });

    it("generates a different token each time", () => {
        expect(generateResetToken().token).not.toBe(generateResetToken().token);
    });

    it("expires after the TTL", () => {
        const now = new Date("2026-11-07T10:00:00Z");
        const expiresAt = resetTokenExpiry(now);
        expect(expiresAt.getTime() - now.getTime()).toBe(RESET_TOKEN_TTL_MINUTES * 60_000);
        expect(isResetTokenExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(false);
        expect(isResetTokenExpired(expiresAt, expiresAt)).toBe(true);
    });
});

describe("request throttle", () => {
    const now = new Date("2026-11-07T10:00:00Z");

    it("allows the first request", () => {
        expect(isResetRequestThrottled(null, now)).toBe(false);
        expect(isResetRequestThrottled(undefined, now)).toBe(false);
    });

    it("blocks a second request inside the cooldown, allows it after", () => {
        const recent = new Date(now.getTime() - (RESET_REQUEST_COOLDOWN_SECONDS - 1) * 1000);
        const old = new Date(now.getTime() - RESET_REQUEST_COOLDOWN_SECONDS * 1000);
        expect(isResetRequestThrottled(recent, now)).toBe(true);
        expect(isResetRequestThrottled(old, now)).toBe(false);
    });
});

describe("buildResetUrl", () => {
    it("uses the locale prefix and encodes the token", () => {
        expect(buildResetUrl("a b", "fr", "https://nutrikafood.com/")).toBe(
            "https://nutrikafood.com/fr/reset-password?token=a%20b"
        );
    });

    it("falls back to en for unknown locales", () => {
        expect(normalizeLocale("de")).toBe("en");
        expect(normalizeLocale(undefined)).toBe("en");
        expect(buildResetUrl("t", "de", "http://localhost:3000")).toBe(
            "http://localhost:3000/en/reset-password?token=t"
        );
    });
});

describe("reset password email", () => {
    const resetUrl = "https://nutrikafood.com/en/reset-password?token=abc&x=1";

    it("is written in French for fr", () => {
        const mail = buildResetPasswordEmail({ resetUrl, locale: "fr", name: "Oussama" });
        expect(mail.subject).toContain("mot de passe");
        expect(mail.text).toContain("Bonjour Oussama,");
        expect(mail.text).toContain(resetUrl);
    });

    it("is written in English by default and mentions the expiry", () => {
        const mail = buildResetPasswordEmail({ resetUrl });
        expect(mail.subject).toBe("Reset your Nutrika password");
        expect(mail.text).toContain(`${RESET_TOKEN_TTL_MINUTES} minutes`);
    });

    it("escapes the user name and the url in the html", () => {
        const mail = buildResetPasswordEmail({ resetUrl, name: '<script>alert("x")</script>' });
        expect(mail.html).not.toContain("<script>");
        expect(mail.html).toContain("&lt;script&gt;");
        expect(mail.html).toContain("token=abc&amp;x=1");
    });
});

describe("resetPasswordSchema", () => {
    it("enforces the same password rules as sign up", () => {
        const weak = resetPasswordSchema.safeParse({ token: "t", password: "abc", confirmPassword: "abc" });
        expect(weak.success).toBe(false);
        const ok = resetPasswordSchema.safeParse({ token: "t", password: "Abcdefg1", confirmPassword: "Abcdefg1" });
        expect(ok.success).toBe(true);
    });

    it("rejects mismatched passwords and a missing token", () => {
        expect(
            resetPasswordSchema.safeParse({ token: "t", password: "Abcdefg1", confirmPassword: "Abcdefg2" }).success
        ).toBe(false);
        expect(
            resetPasswordSchema.safeParse({ token: "", password: "Abcdefg1", confirmPassword: "Abcdefg1" }).success
        ).toBe(false);
    });
});
