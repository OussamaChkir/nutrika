import { describe, expect, it } from "vitest";

import { FEATURE_FLAGS } from "../flags";

import { buildMobileConfig, DEFAULT_MIN_APP_VERSION } from "./config";

describe("buildMobileConfig", () => {
    it("lists every feature flag and no secrets", () => {
        const config = buildMobileConfig({});
        expect(Object.keys(config.flags).sort()).toEqual([...FEATURE_FLAGS].sort());
        expect(JSON.stringify(config)).not.toMatch(/secret|key|token/i);
    });

    it("reports which sign-in methods are configured", () => {
        expect(buildMobileConfig({}).auth).toEqual({ email: true, google: false, apple: false });
        expect(buildMobileConfig({ GOOGLE_CLIENT_IDS: "a,b", APPLE_CLIENT_IDS: "com.x" }).auth).toEqual({ email: true, google: true, apple: true });
    });

    it("uses the configured minimum version only if it is valid semver", () => {
        expect(buildMobileConfig({ MOBILE_MIN_APP_VERSION: "1.4.2" }).minAppVersion).toBe("1.4.2");
        expect(buildMobileConfig({ MOBILE_MIN_APP_VERSION: "latest" }).minAppVersion).toBe(DEFAULT_MIN_APP_VERSION);
        expect(buildMobileConfig({}).minAppVersion).toBe(DEFAULT_MIN_APP_VERSION);
    });
});
