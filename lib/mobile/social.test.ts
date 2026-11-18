import { createHash } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import {
    cleanName,
    parseClientIds,
    planSocialSignIn,
    SocialTokenError,
    verifyIdToken,
    type SocialIdentity,
} from "./social";

const NOW = new Date("2026-11-18T10:00:00Z");
const nowSec = Math.floor(NOW.getTime() / 1000);
const AUD = "com.nutrikafood.app";

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    const other = await generateKeyPair("RS256");
    privateKey = pair.privateKey as CryptoKey;
    otherPrivateKey = other.privateKey as CryptoKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
    keys = createLocalJWKSet({ keys: [jwk] });
});

async function token(
    claims: Record<string, unknown>,
    opts: { iss?: string; aud?: string; exp?: number; key?: CryptoKey; kid?: string } = {}
) {
    return new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: opts.kid ?? "k1" })
        .setIssuer(opts.iss ?? "https://appleid.apple.com")
        .setAudience(opts.aud ?? AUD)
        .setIssuedAt(nowSec)
        .setExpirationTime(opts.exp ?? nowSec + 600)
        .sign(opts.key ?? privateKey);
}

const verify = (provider: "apple" | "google", t: string, extra: { nonce?: string; audiences?: string[] } = {}) =>
    verifyIdToken(provider, t, { audiences: [AUD], keys, now: NOW, ...extra });

async function reason(p: Promise<unknown>) {
    try {
        await p;
        return null;
    } catch (e) {
        return e instanceof SocialTokenError ? e.reason : "other";
    }
}

describe("verifyIdToken", () => {
    it("accepts a valid Apple token and reads the claims", async () => {
        const t = await token({ sub: "apple-123", email: "Jane@Example.com", email_verified: "true", is_private_email: "false" });
        expect(await verify("apple", t)).toEqual({
            provider: "apple",
            providerAccountId: "apple-123",
            email: "jane@example.com",
            emailVerified: true,
            isPrivateEmail: false,
            name: null,
            picture: null,
        });
    });

    it("handles Apple booleans sent as strings and private relay addresses", async () => {
        const t = await token({ sub: "a", email: "abc@privaterelay.appleid.com", email_verified: true, is_private_email: "true" });
        const id = await verify("apple", t);
        expect(id.emailVerified).toBe(true);
        expect(id.isPrivateEmail).toBe(true);
    });

    it("accepts both Google issuer spellings and reads name and picture", async () => {
        for (const iss of ["https://accounts.google.com", "accounts.google.com"]) {
            const t = await token({ sub: "g1", email: "a@b.co", email_verified: true, name: "Ada", picture: "https://x/y.png" }, { iss });
            const id = await verify("google", t);
            expect(id).toMatchObject({ provider: "google", providerAccountId: "g1", name: "Ada", picture: "https://x/y.png", emailVerified: true });
        }
    });

    it("rejects the wrong issuer (an Apple token sent to the Google endpoint)", async () => {
        const t = await token({ sub: "x", email: "a@b.co" }, { iss: "https://appleid.apple.com" });
        expect(await reason(verify("google", t))).toBe("invalid_token");
    });

    it("rejects a token meant for another app (audience)", async () => {
        const t = await token({ sub: "x" }, { aud: "com.someone.else" });
        expect(await reason(verify("apple", t))).toBe("invalid_token");
    });

    it("accepts any of several configured audiences", async () => {
        const t = await token({ sub: "x" }, { aud: "ios-client" });
        expect(await reason(verify("google", await token({ sub: "x" }, { aud: "ios-client", iss: "https://accounts.google.com" }), { audiences: ["web-client", "ios-client"] }))).toBeNull();
        expect(t).toBeTruthy();
    });

    it("rejects an expired token", async () => {
        const t = await token({ sub: "x" }, { exp: nowSec - 10 });
        expect(await reason(verify("apple", t))).toBe("invalid_token");
    });

    it("rejects a token signed by someone else's key", async () => {
        const t = await token({ sub: "x" }, { key: otherPrivateKey });
        expect(await reason(verify("apple", t))).toBe("invalid_token");
    });

    it("rejects an unsigned (alg none) token and plain garbage", async () => {
        const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
        const body = Buffer.from(JSON.stringify({ sub: "x", iss: "https://appleid.apple.com", aud: AUD, exp: nowSec + 600 })).toString("base64url");
        expect(await reason(verify("apple", `${header}.${body}.`))).toBe("invalid_token");
        expect(await reason(verify("apple", "garbage"))).toBe("invalid_token");
    });

    it("requires a subject", async () => {
        expect(await reason(verify("apple", await token({ email: "a@b.co" })))).toBe("no_subject");
    });

    it("reports not_configured when no client id is set, instead of accepting any audience", async () => {
        const t = await token({ sub: "x" });
        expect(await reason(verifyIdToken("apple", t, { audiences: [], keys, now: NOW }))).toBe("not_configured");
    });

    describe("nonce", () => {
        const raw = "raw-nonce-12345678";
        it("accepts the raw nonce or its SHA-256 hex in the token", async () => {
            expect(await reason(verify("apple", await token({ sub: "x", nonce: raw }), { nonce: raw }))).toBeNull();
            const hashed = createHash("sha256").update(raw).digest("hex");
            expect(await reason(verify("apple", await token({ sub: "x", nonce: hashed }), { nonce: raw }))).toBeNull();
        });
        it("rejects a different or missing nonce when one was sent", async () => {
            expect(await reason(verify("apple", await token({ sub: "x", nonce: "other" }), { nonce: raw }))).toBe("nonce_mismatch");
            expect(await reason(verify("apple", await token({ sub: "x" }), { nonce: raw }))).toBe("nonce_mismatch");
        });
        it("is not required when the app did not send one", async () => {
            expect(await reason(verify("apple", await token({ sub: "x", nonce: "whatever" })))).toBeNull();
        });
    });

    it("treats a missing email_verified as unverified", async () => {
        const id = await verify("apple", await token({ sub: "x", email: "a@b.co" }));
        expect(id.emailVerified).toBe(false);
    });
});

describe("planSocialSignIn", () => {
    const identity = (over: Partial<SocialIdentity> = {}): SocialIdentity => ({
        provider: "google",
        providerAccountId: "g1",
        email: "a@b.co",
        emailVerified: true,
        isPrivateEmail: false,
        name: "Ada",
        picture: null,
        ...over,
    });

    it("signs in an already linked account, even without an email", () => {
        expect(planSocialSignIn({ identity: identity({ email: null, emailVerified: false }), linkedUserId: "u1", userByEmail: null })).toEqual({ action: "sign_in", userId: "u1" });
    });

    it("creates an account for a new verified email, using the provider name", () => {
        expect(planSocialSignIn({ identity: identity(), linkedUserId: null, userByEmail: null })).toEqual({ action: "create", email: "a@b.co", name: "Ada" });
    });

    it("falls back to the name the app forwarded (Apple first sign-in)", () => {
        const plan = planSocialSignIn({ identity: identity({ name: null }), linkedUserId: null, userByEmail: null, providedName: "  Grace   Hopper " });
        expect(plan).toEqual({ action: "create", email: "a@b.co", name: "Grace Hopper" });
    });

    it("links to an existing account with the same verified email", () => {
        const plan = planSocialSignIn({ identity: identity(), linkedUserId: null, userByEmail: { id: "u9", emailVerified: new Date(), hasPassword: true } });
        expect(plan).toEqual({ action: "link", userId: "u9", clearPassword: false });
    });

    it("clears the password when linking to a password account whose email was never verified (pre-registration takeover)", () => {
        const plan = planSocialSignIn({ identity: identity(), linkedUserId: null, userByEmail: { id: "u9", emailVerified: null, hasPassword: true } });
        expect(plan).toEqual({ action: "link", userId: "u9", clearPassword: true });
    });

    it("does not clear anything when the existing account has no password", () => {
        const plan = planSocialSignIn({ identity: identity(), linkedUserId: null, userByEmail: { id: "u9", emailVerified: null, hasPassword: false } });
        expect(plan).toEqual({ action: "link", userId: "u9", clearPassword: false });
    });

    it("refuses to link or create on an unverified email", () => {
        expect(planSocialSignIn({ identity: identity({ emailVerified: false }), linkedUserId: null, userByEmail: { id: "u9", emailVerified: new Date(), hasPassword: false } })).toEqual({ action: "reject", reason: "email_unverified" });
    });

    it("refuses when the provider gave no email and nothing is linked yet", () => {
        expect(planSocialSignIn({ identity: identity({ email: null, emailVerified: false }), linkedUserId: null, userByEmail: null })).toEqual({ action: "reject", reason: "email_missing" });
    });
});

describe("small helpers", () => {
    it("parses comma separated client ids", () => {
        expect(parseClientIds(" a, b ,,c ")).toEqual(["a", "b", "c"]);
        expect(parseClientIds(undefined)).toEqual([]);
    });
    it("cleans names", () => {
        expect(cleanName("  A   B ")).toBe("A B");
        expect(cleanName("")).toBeNull();
        expect(cleanName(null)).toBeNull();
        expect(cleanName("x".repeat(200))).toHaveLength(80);
    });
});
