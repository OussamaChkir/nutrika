import { defineConfig } from "vitest/config";

// Fast, browser-free unit tests for pure logic (scoring, parsing, ...).
// The Storybook component tests keep their own config in vitest.config.ts.
export default defineConfig({
    test: {
        name: "unit",
        environment: "node",
        include: ["lib/**/*.test.ts"],
    },
});
