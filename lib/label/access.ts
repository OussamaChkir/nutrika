// F5: who may use photo scanning, and how often. Pure.
//
// WHY A REGION GATE: Google's Gemini API terms allow only PAID services for apps made available
// to users in the European Economic Area, Switzerland and the UK, and say free-tier content may
// be used by Google and read by human reviewers. So on the free tier photo scanning is limited to
// users outside those regions; with a paid (billing-enabled) key (GEMINI_TIER=paid) it is open to
// everyone. Unknown country fails closed on the free tier.

export type GeminiTier = "free" | "paid";

export function parseTier(value: string | undefined): GeminiTier {
    return value?.trim().toLowerCase() === "paid" ? "paid" : "free";
}

/** EEA (EU + Iceland, Liechtenstein, Norway), Switzerland and the United Kingdom, ISO 3166-1 alpha-2. */
export const RESTRICTED_COUNTRIES: ReadonlySet<string> = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT",
    "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    "IS", "LI", "NO", "CH", "GB",
]);

export type AccessDecision = { allowed: true } | { allowed: false; reason: "region" | "unknown_region" };

export function checkRegion(tier: GeminiTier, country: string | null | undefined): AccessDecision {
    if (tier === "paid") return { allowed: true };
    const code = country?.trim().toUpperCase();
    if (!code || !/^[A-Z]{2}$/.test(code)) return { allowed: false, reason: "unknown_region" };
    return RESTRICTED_COUNTRIES.has(code) ? { allowed: false, reason: "region" } : { allowed: true };
}

// ---------- quotas ----------

/** PRODUCT DECISION (from the roadmap): 5 photo scans per user per rolling 24 hours. */
export const PER_USER_PER_DAY = 5;
/** Default total per rolling 24 hours, to stay under the free quota. Override with GEMINI_DAILY_BUDGET. */
export const DEFAULT_GLOBAL_PER_DAY = 200;
export const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Usage rows older than this are deleted. */
export const USAGE_RETENTION_MS = 7 * WINDOW_MS;

export function parseDailyBudget(value: string | undefined): number {
    const n = Number.parseInt(value ?? "", 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 100_000) : DEFAULT_GLOBAL_PER_DAY;
}

export type QuotaDecision = { ok: true; remaining: number } | { ok: false; reason: "user_limit" | "global_limit" };

/** `userCount` and `globalCount` are the scans already made in the last 24 hours. */
export function decideQuota(input: { userCount: number; globalCount: number; globalBudget: number }): QuotaDecision {
    if (input.userCount >= PER_USER_PER_DAY) return { ok: false, reason: "user_limit" };
    if (input.globalCount >= input.globalBudget) return { ok: false, reason: "global_limit" };
    return { ok: true, remaining: PER_USER_PER_DAY - input.userCount - 1 };
}
