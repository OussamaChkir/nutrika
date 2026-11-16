import { createHash, randomBytes } from "node:crypto";

// Pure helpers for the password reset flow (no database, no network), so they are easy to test.
// The server actions that use them live in lib/auth-actions.ts.

/** How long a reset link works. */
export const RESET_TOKEN_TTL_MINUTES = 60;

/** A user cannot trigger a new reset email more often than this (limits mail bombing). */
export const RESET_REQUEST_COOLDOWN_SECONDS = 60;

const DEFAULT_APP_URL = "https://nutrikafood.com";

export function hashResetToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a reset token. The raw token goes in the email link and is never stored;
 * only its hash is saved, so a database leak does not expose working links.
 */
export function generateResetToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("hex");
    return { token, tokenHash: hashResetToken(token) };
}

export function resetTokenExpiry(now: Date = new Date()): Date {
    return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000);
}

export function isResetTokenExpired(expiresAt: Date, now: Date = new Date()): boolean {
    return expiresAt.getTime() <= now.getTime();
}

/** True when the last reset email for this user was sent too recently to send another. */
export function isResetRequestThrottled(lastCreatedAt: Date | null | undefined, now: Date = new Date()): boolean {
    if (!lastCreatedAt) return false;
    return now.getTime() - lastCreatedAt.getTime() < RESET_REQUEST_COOLDOWN_SECONDS * 1000;
}

export function normalizeLocale(locale: string | undefined): "en" | "fr" {
    return locale === "fr" ? "fr" : "en";
}

/** Link sent in the email. The locale prefix is always present (next-intl default). */
export function buildResetUrl(token: string, locale: string | undefined, appUrl: string | undefined = process.env.NEXT_PUBLIC_APP_URL): string {
    const base = (appUrl || DEFAULT_APP_URL).replace(/\/+$/, "");
    return `${base}/${normalizeLocale(locale)}/reset-password?token=${encodeURIComponent(token)}`;
}
