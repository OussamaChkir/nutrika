import { defineConfig } from "@playwright/test";

// End-to-end tests (F8 offline mode). They run against a running app:
//   E2E_BASE_URL=https://your-preview.vercel.app npx playwright test
// or locally, with the app started with NEXT_PUBLIC_FF_OFFLINE_MODE=1:
//   npm run dev   (then, in another terminal)   npx playwright test
export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    retries: 0,
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
        trace: "retain-on-failure",
        // Only needed when the installed Chromium is not the build this Playwright version expects.
        launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
    },
});
