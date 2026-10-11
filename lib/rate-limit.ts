/**
 * Minimal fixed-window rate limiter, kept in memory.
 *
 * Good enough to stop one signed-in user from burning the free Gemini quota.
 * On serverless hosts (Vercel) each instance has its own counter, so the real limit is
 * "per user, per warm instance". Swap the Map for Redis / a Mongo collection when it matters.
 */
export interface RateLimiter {
    /** Returns true if the call is allowed and counts it. */
    take(key: string): boolean;
}

export function createRateLimiter(
    limit: number,
    windowMs: number,
    now: () => number = Date.now
): RateLimiter {
    const buckets = new Map<string, { count: number; resetAt: number }>();

    return {
        take(key) {
            const t = now();
            const bucket = buckets.get(key);

            if (!bucket || t >= bucket.resetAt) {
                // Opportunistic cleanup so the Map cannot grow without bound.
                if (buckets.size > 5000) {
                    for (const [k, b] of buckets) if (t >= b.resetAt) buckets.delete(k);
                }
                buckets.set(key, { count: 1, resetAt: t + windowMs });
                return true;
            }
            if (bucket.count >= limit) return false;
            bucket.count += 1;
            return true;
        },
    };
}
