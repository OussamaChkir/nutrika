import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

// Sign in with Apple / Google from the native app. The app obtains an identity token (a JWT signed by
// Apple or Google) and sends it here; we check the signature against the provider's public keys, the
// issuer, the audience (our own client IDs) and the expiry. Nothing is trusted before that.

export type SocialProvider = "apple" | "google";

export interface SocialIdentity {
    provider: SocialProvider;
    /** Stable id of the person at the provider (`sub`). Never changes, unlike the email. */
    providerAccountId: string;
    email: string | null;
    emailVerified: boolean;
    /** Apple "Hide My Email" address. Mail to it still reaches the person. */
    isPrivateEmail: boolean;
    name: string | null;
    picture: string | null;
}

const PROVIDERS = {
    apple: {
        issuers: ["https://appleid.apple.com"],
        jwksUrl: "https://appleid.apple.com/auth/keys",
    },
    google: {
        issuers: ["https://accounts.google.com", "accounts.google.com"],
        jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    },
} as const;

const remoteKeys: Partial<Record<SocialProvider, JWTVerifyGetKey>> = {};

/** jose caches the keys and refetches when Apple/Google rotate them. */
function keysFor(provider: SocialProvider): JWTVerifyGetKey {
    remoteKeys[provider] ??= createRemoteJWKSet(new URL(PROVIDERS[provider].jwksUrl));
    return remoteKeys[provider]!;
}

/** Client IDs we accept as audience, from a comma separated env var. */
export function parseClientIds(value: string | undefined): string[] {
    return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function configuredAudiences(provider: SocialProvider, env: Record<string, string | undefined> = process.env): string[] {
    return parseClientIds(provider === "apple" ? env.APPLE_CLIENT_IDS : env.GOOGLE_CLIENT_IDS);
}

export class SocialTokenError extends Error {
    constructor(public reason: "not_configured" | "invalid_token" | "nonce_mismatch" | "no_subject") {
        super(reason);
        this.name = "SocialTokenError";
    }
}

function asBool(value: unknown): boolean {
    return value === true || value === "true";
}

function sha256Hex(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

/**
 * Verifies an identity token and returns who it belongs to.
 * `nonce`: if the app sent one, the token must carry it, either as is or as its SHA-256 hex
 * (Expo's Apple sign-in sends the hash to Apple). It prevents replaying a stolen token.
 */
export async function verifyIdToken(
    provider: SocialProvider,
    idToken: string,
    options: { audiences?: string[]; nonce?: string; keys?: JWTVerifyGetKey; now?: Date } = {}
): Promise<SocialIdentity> {
    const audiences = options.audiences ?? configuredAudiences(provider);
    if (audiences.length === 0) throw new SocialTokenError("not_configured");

    let payload;
    try {
        ({ payload } = await jwtVerify(idToken, options.keys ?? keysFor(provider), {
            issuer: [...PROVIDERS[provider].issuers],
            audience: audiences,
            currentDate: options.now,
            algorithms: ["RS256", "ES256"],
        }));
    } catch {
        throw new SocialTokenError("invalid_token");
    }

    if (typeof payload.sub !== "string" || payload.sub.length === 0) throw new SocialTokenError("no_subject");

    if (options.nonce) {
        const claim = typeof payload.nonce === "string" ? payload.nonce : null;
        if (!claim || (claim !== options.nonce && claim !== sha256Hex(options.nonce))) {
            throw new SocialTokenError("nonce_mismatch");
        }
    }

    const email = typeof payload.email === "string" && payload.email.length > 0 ? payload.email.trim().toLowerCase() : null;
    return {
        provider,
        providerAccountId: payload.sub,
        email,
        emailVerified: email !== null && asBool(payload.email_verified),
        isPrivateEmail: asBool(payload.is_private_email),
        name: typeof payload.name === "string" ? payload.name : null,
        picture: typeof payload.picture === "string" ? payload.picture : null,
    };
}

// ---------------------------------------------------------------------------
// What to do with a verified identity (pure, tested)
// ---------------------------------------------------------------------------

export interface ExistingUser {
    id: string;
    emailVerified: Date | null;
    hasPassword: boolean;
}

export type SocialPlan =
    /** Already linked: sign that user in. */
    | { action: "sign_in"; userId: string }
    /** An account with this verified email exists: link the provider to it. */
    | { action: "link"; userId: string; clearPassword: boolean }
    /** Nobody yet: create the account. */
    | { action: "create"; email: string; name: string | null }
    /** Cannot continue. */
    | { action: "reject"; reason: "email_unverified" | "email_missing" };

/**
 * Account linking rules.
 * - Same provider account seen before: sign in, whatever the email says now.
 * - Otherwise we need an email the provider vouches for. Linking on an unverified email would let an
 *   attacker take over an account.
 * - If the matching account was created with a password and its email was never verified, the
 *   password may belong to an attacker who registered the victim's address first. The real owner just
 *   proved they own the email, so the password is cleared (they can set a new one by email).
 */
export function planSocialSignIn(input: {
    identity: SocialIdentity;
    linkedUserId: string | null;
    userByEmail: ExistingUser | null;
    providedName?: string | null;
}): SocialPlan {
    const { identity, linkedUserId, userByEmail, providedName } = input;
    if (linkedUserId) return { action: "sign_in", userId: linkedUserId };
    if (!identity.email) return { action: "reject", reason: "email_missing" };
    if (!identity.emailVerified) return { action: "reject", reason: "email_unverified" };
    if (userByEmail) {
        return {
            action: "link",
            userId: userByEmail.id,
            clearPassword: userByEmail.hasPassword && userByEmail.emailVerified === null,
        };
    }
    return { action: "create", email: identity.email, name: identity.name ?? cleanName(providedName) };
}

/** Apple only sends the name the first time, and the app passes it along separately. */
export function cleanName(name: string | null | undefined): string | null {
    const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
    return trimmed.length >= 1 ? trimmed.slice(0, 80) : null;
}
