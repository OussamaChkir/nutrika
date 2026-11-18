import { FEATURE_FLAGS, isFeatureEnabled, type FeatureFlag } from "../flags";

import { configuredAudiences } from "./social";

// Public configuration the app reads at start-up (GET /api/v1/config): feature flags decided on the
// server (no app release needed to switch a feature), the oldest app version still allowed, and
// which sign-in methods are set up. Contains no secrets.

export const API_VERSION = 1;
export const DEFAULT_MIN_APP_VERSION = "1.0.0";

export interface MobileConfig {
    apiVersion: number;
    /** Apps older than this show an "update required" screen. Semver "major.minor.patch". */
    minAppVersion: string;
    flags: Record<FeatureFlag, boolean>;
    auth: { email: true; google: boolean; apple: boolean };
}

export function buildMobileConfig(env: Record<string, string | undefined> = process.env): MobileConfig {
    const flags = Object.fromEntries(FEATURE_FLAGS.map((flag) => [flag, isFeatureEnabled(flag)])) as Record<FeatureFlag, boolean>;
    return {
        apiVersion: API_VERSION,
        minAppVersion: /^\d+\.\d+\.\d+$/.test(env.MOBILE_MIN_APP_VERSION ?? "") ? (env.MOBILE_MIN_APP_VERSION as string) : DEFAULT_MIN_APP_VERSION,
        flags,
        auth: {
            email: true,
            google: configuredAudiences("google", env).length > 0,
            apple: configuredAudiences("apple", env).length > 0,
        },
    };
}
