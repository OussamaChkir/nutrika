import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

// Tokens for the mobile app (API v1). Pure: no database, so it is easy to test.
//
//   access token  = short-lived signed JWT (HS256). Stateless: the API checks the signature only.
//   refresh token = long random string. Only its SHA-256 hash is stored (RefreshToken model),
//                   and every use rotates it (see lib/mobile/sessions.ts).
//
// The web site keeps its own NextAuth cookie session; these tokens are never accepted there.

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 60;

const ISSUER = "nutrika";
const AUDIENCE = "nutrika-mobile";
const REFRESH_PREFIX = "nrt_";

export class MissingSecretError extends Error {
    constructor() {
        super("MOBILE_ACCESS_TOKEN_SECRET (or AUTH_SECRET) is not set");
        this.name = "MissingSecretError";
    }
}

/** A dedicated secret is preferred, so rotating the web secret does not log out mobile users. */
function secretKey(secret: string | undefined = process.env.MOBILE_ACCESS_TOKEN_SECRET || process.env.AUTH_SECRET) {
    if (!secret || secret.length < 16) throw new MissingSecretError();
    return new TextEncoder().encode(secret);
}

export interface AccessClaims {
    userId: string;
    role: string;
}

export async function signAccessToken(
    claims: AccessClaims,
    options: { now?: Date; secret?: string } = {}
): Promise<{ token: string; expiresIn: number }> {
    const iat = Math.floor((options.now ?? new Date()).getTime() / 1000);
    const token = await new SignJWT({ role: claims.role })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt(iat)
        .setExpirationTime(iat + ACCESS_TOKEN_TTL_SECONDS)
        .sign(secretKey(options.secret));
    return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

/** Returns the claims, or null for anything wrong (bad signature, expired, wrong audience, ...). */
export async function verifyAccessToken(
    token: string,
    options: { now?: Date; secret?: string } = {}
): Promise<AccessClaims | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey(options.secret), {
            algorithms: ["HS256"],
            issuer: ISSUER,
            audience: AUDIENCE,
            currentDate: options.now,
        });
        if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
        return { userId: payload.sub, role: payload.role };
    } catch (error) {
        if (error instanceof MissingSecretError) throw error;
        return null;
    }
}

export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/** The raw token goes to the app once and is never stored; only the hash is. */
export function generateRefreshToken(): { token: string; tokenHash: string } {
    const token = REFRESH_PREFIX + randomBytes(32).toString("base64url");
    return { token, tokenHash: hashRefreshToken(token) };
}

export function refreshTokenExpiry(now: Date = new Date()): Date {
    return new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function generateFamilyId(): string {
    return randomBytes(12).toString("hex");
}

export interface RefreshRecord {
    expiresAt: Date;
    revokedAt: Date | null;
}

/**
 * What to do with a refresh token that was presented:
 *  - "unknown"  : no such token
 *  - "reuse"    : it was already rotated or revoked, so someone replayed it: revoke the whole family
 *  - "expired"  : too old, the user must sign in again
 *  - "ok"       : rotate it
 */
export function decideRefresh(record: RefreshRecord | null, now: Date = new Date()): "unknown" | "reuse" | "expired" | "ok" {
    if (!record) return "unknown";
    if (record.revokedAt) return "reuse";
    if (record.expiresAt.getTime() <= now.getTime()) return "expired";
    return "ok";
}

/** Pulls the token out of an `Authorization: Bearer <token>` header. */
export function parseBearer(header: string | null | undefined): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    return match ? match[1] : null;
}
