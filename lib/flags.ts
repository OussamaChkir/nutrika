// Feature flags (env-based, enough for a solo project).
//
// Every roadmap feature ships behind a flag, off by default:
//
//   NEXT_PUBLIC_FF_PERSONAL_SCORE=1
//
// Accepted "on" values: 1, true, on, yes (case-insensitive). Anything else is off.
//
// Flags are NEXT_PUBLIC_* on purpose: the same flag is read on the server and in the
// browser, and Next inlines it at build time. Changing a flag therefore needs a redeploy.
// Never put secrets in a flag. Pure module: safe on server, client and offline.

export const FEATURE_FLAGS = [
    "personalScore", // F1
    "familyProfiles", // F4
    "ingredientExplanations", // F6
    "mayContainMode", // F7
    "alternatives", // F2 (note: an early version already ships ungated; this flag is for the new one)
    "shoppingList", // F3
    "scanInsights", // F9
    "offlineMode", // F8
    "labelScan", // F5
    "menuMode", // F10
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type FlagSource = Partial<Record<FeatureFlag, string | undefined>>;

// Next only inlines `process.env.NEXT_PUBLIC_X` when it is written literally,
// so each variable is listed explicitly here (no dynamic lookup).
const ENV_FLAGS: FlagSource = {
    personalScore: process.env.NEXT_PUBLIC_FF_PERSONAL_SCORE,
    familyProfiles: process.env.NEXT_PUBLIC_FF_FAMILY_PROFILES,
    ingredientExplanations: process.env.NEXT_PUBLIC_FF_INGREDIENT_EXPLANATIONS,
    mayContainMode: process.env.NEXT_PUBLIC_FF_MAY_CONTAIN_MODE,
    alternatives: process.env.NEXT_PUBLIC_FF_ALTERNATIVES,
    shoppingList: process.env.NEXT_PUBLIC_FF_SHOPPING_LIST,
    scanInsights: process.env.NEXT_PUBLIC_FF_SCAN_INSIGHTS,
    offlineMode: process.env.NEXT_PUBLIC_FF_OFFLINE_MODE,
    labelScan: process.env.NEXT_PUBLIC_FF_LABEL_SCAN,
    menuMode: process.env.NEXT_PUBLIC_FF_MENU_MODE,
};

/** Parse a raw flag value. Unset or unrecognised means off. */
export function parseFlag(value: string | undefined): boolean {
    if (!value) return false;
    return ["1", "true", "on", "yes"].includes(value.trim().toLowerCase());
}

/**
 * Is a feature enabled?
 * `source` is only for tests and Storybook; app code calls `isFeatureEnabled("personalScore")`.
 */
export function isFeatureEnabled(flag: FeatureFlag, source: FlagSource = ENV_FLAGS): boolean {
    return parseFlag(source[flag]);
}
