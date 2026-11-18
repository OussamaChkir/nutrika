import { prisma } from "../db";

import { checkRules, type RateLimitStore, type RateRule } from "./rate-limit-db";
import {
    decideRefresh,
    generateFamilyId,
    generateRefreshToken,
    hashRefreshToken,
    refreshTokenExpiry,
    signAccessToken,
} from "./tokens";

// Database side of mobile sessions: create, rotate and revoke refresh tokens.
// Decisions (is this token usable?) live in tokens.ts so they can be unit tested.

export interface DeviceInfo {
    deviceName?: string | null;
    platform?: "ios" | "android" | null;
}

export interface TokenPair {
    tokenType: "Bearer";
    accessToken: string;
    /** Seconds until the access token expires. */
    expiresIn: number;
    refreshToken: string;
}

async function mint(userId: string, role: string, familyId: string, device: DeviceInfo): Promise<TokenPair> {
    const { token: refreshToken, tokenHash } = generateRefreshToken();
    await prisma.refreshToken.create({
        data: {
            userId,
            tokenHash,
            familyId,
            deviceName: device.deviceName?.slice(0, 80) ?? null,
            platform: device.platform ?? null,
            expiresAt: refreshTokenExpiry(),
        },
    });
    const { token: accessToken, expiresIn } = await signAccessToken({ userId, role });
    return { tokenType: "Bearer", accessToken, expiresIn, refreshToken };
}

/** New sign-in on a device: starts a new token family. */
export function startSession(userId: string, role: string, device: DeviceInfo = {}): Promise<TokenPair> {
    return mint(userId, role, generateFamilyId(), device);
}

export type RefreshOutcome =
    | { ok: true; tokens: TokenPair; userId: string }
    | { ok: false; reason: "invalid" | "expired" | "reuse" };

/**
 * Exchanges a refresh token for a new pair. The old token is revoked in the same step, so each token
 * works once. A revoked token being presented again revokes its whole family (replay protection).
 */
export async function rotateRefreshToken(rawToken: string, device: DeviceInfo = {}): Promise<RefreshOutcome> {
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(rawToken) } });
    const decision = decideRefresh(record);

    if (decision === "unknown") return { ok: false, reason: "invalid" };
    if (!record) return { ok: false, reason: "invalid" }; // narrows the type; unreachable
    if (decision === "reuse") {
        await prisma.refreshToken.updateMany({ where: { familyId: record.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
        return { ok: false, reason: "reuse" };
    }
    if (decision === "expired") return { ok: false, reason: "expired" };

    // Claim it: of two simultaneous requests with the same token, only one sees count === 1.
    const claimed = await prisma.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) return { ok: false, reason: "invalid" };

    const user = await prisma.user.findUnique({ where: { id: record.userId }, select: { id: true, role: true } });
    if (!user) return { ok: false, reason: "invalid" };

    const tokens = await mint(user.id, user.role, record.familyId, {
        deviceName: device.deviceName ?? record.deviceName,
        platform: device.platform ?? (record.platform as DeviceInfo["platform"]),
    });
    return { ok: true, tokens, userId: user.id };
}

/** Sign out this device: revokes the token's whole family. Unknown tokens are ignored. */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
    const record = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(rawToken) },
        select: { familyId: true },
    });
    if (!record) return;
    await prisma.refreshToken.updateMany({ where: { familyId: record.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** After a password reset or account deletion: every device must sign in again. */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Rate limiting backed by MongoDB
// ---------------------------------------------------------------------------

const dbStore: RateLimitStore = {
    countSince: (key, since) => prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } }),
    async add(key, at) {
        await prisma.rateLimitHit.create({ data: { key, createdAt: at } });
    },
    async pruneBefore(before) {
        await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: before } } });
    },
};

export function rateLimit(checks: Array<{ rule: RateRule; callerKey: string }>) {
    return checkRules(dbStore, checks);
}
