// Rate limiting that survives serverless cold starts and works across instances: every attempt is a row
// in the database (RateLimitHit) and a limit is "no more than N rows for this key in the last W ms".
// Not atomic (two simultaneous requests can both pass at the limit), which is fine for brute-force
// protection. The store is injected so the logic is testable without a database.

export interface RateLimitStore {
    countSince(key: string, since: Date): Promise<number>;
    add(key: string, at: Date): Promise<void>;
    pruneBefore(before: Date): Promise<void>;
}

export interface RateRule {
    /** Bucket name, e.g. "login:ip". The caller key (IP, email) is appended. */
    name: string;
    limit: number;
    windowMs: number;
}

const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;
const PRUNE_EVERY = 0.02; // about 1 request in 50 also deletes old rows

export async function takeFromStore(
    store: RateLimitStore,
    rule: RateRule,
    callerKey: string,
    options: { now?: Date; random?: () => number } = {}
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = options.now ?? new Date();
    const random = options.random ?? Math.random;
    const key = `${rule.name}:${callerKey}`;

    const used = await store.countSince(key, new Date(now.getTime() - rule.windowMs));
    if (used >= rule.limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil(rule.windowMs / 1000) };
    }
    await store.add(key, now);
    if (random() < PRUNE_EVERY) await store.pruneBefore(new Date(now.getTime() - PRUNE_AFTER_MS));
    return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Checks every rule; the request passes only if all pass. Stops at the first refusal.
 * A store failure lets the request through (fail open): auth must not go down with the rate limiter.
 */
export async function checkRules(
    store: RateLimitStore,
    checks: Array<{ rule: RateRule; callerKey: string }>,
    options: { now?: Date; random?: () => number } = {}
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
    for (const { rule, callerKey } of checks) {
        try {
            const result = await takeFromStore(store, rule, callerKey, options);
            if (!result.allowed) return { allowed: false, retryAfterSeconds: result.retryAfterSeconds };
        } catch (error) {
            console.error("Rate limit store error:", error);
        }
    }
    return { allowed: true };
}

// Rules used by the auth endpoints. Per IP stops one machine, per email stops a spread-out guessing attack.
export const RATE_RULES = {
    loginIp: { name: "login:ip", limit: 20, windowMs: 15 * 60_000 },
    loginEmail: { name: "login:email", limit: 8, windowMs: 15 * 60_000 },
    registerIp: { name: "register:ip", limit: 10, windowMs: 60 * 60_000 },
    socialIp: { name: "social:ip", limit: 30, windowMs: 15 * 60_000 },
    refreshIp: { name: "refresh:ip", limit: 120, windowMs: 15 * 60_000 },
    forgotIp: { name: "forgot:ip", limit: 10, windowMs: 60 * 60_000 },
    forgotEmail: { name: "forgot:email", limit: 3, windowMs: 60 * 60_000 },
    resetIp: { name: "reset:ip", limit: 20, windowMs: 60 * 60_000 },
    deleteUser: { name: "delete:user", limit: 5, windowMs: 60 * 60_000 },
    // Each search asks Open Food Facts, which asks for a polite request rate.
    searchUser: { name: "search:user", limit: 30, windowMs: 60_000 },
    // Generating an explanation costs LLM quota: same limit as the website (10 new ones per hour).
    explainUser: { name: "explain:user", limit: 10, windowMs: 60 * 60_000 },
    feedbackUser: { name: "feedback:user", limit: 30, windowMs: 60 * 60_000 },
    searchIp: { name: "search:ip", limit: 90, windowMs: 60_000 },
} as const satisfies Record<string, RateRule>;
