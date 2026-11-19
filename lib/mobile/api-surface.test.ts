import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// GUARDRAIL for the App Store. This test lists every endpoint the mobile API exposes and fails when one
// is added or changed without this list being updated, so nobody ships a new capability by accident.
//
// Rules this list protects (Apple App Review Guidelines):
//  - 1.2  User-generated content: the app cannot create content other people see. There is NO endpoint to
//         add or edit a product, post a comment or a review text, or upload a photo. Ratings are stars only.
//  - 5.1.1(v) Account deletion exists in the app (DELETE /me).
//  - 4.8  Sign in with Apple exists next to Google.
//  - 5.1.2(i) Personal data is not sent to a third-party AI without explicit consent: there is NO label photo
//         scan endpoint. Add one only together with a consent screen in the app.
//  - 3.1.1 No payments: no purchase, subscription or premium endpoint. v1 is free.
//
// When you add an endpoint: check the list above, then add it here in the same pull request.

const ROOT = join(process.cwd(), "app", "api", "v1");

function routeFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return routeFiles(full);
        return entry.name === "route.ts" ? [full] : [];
    });
}

function surface(): string[] {
    const out: string[] = [];
    for (const file of routeFiles(ROOT)) {
        const path = "/" + relative(ROOT, file).split(sep).slice(0, -1).join("/");
        const source = readFileSync(file, "utf8");
        const methods = [...source.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
        for (const method of methods) out.push(`${method} ${path}`);
    }
    return out.sort();
}

const ALLOWED = [
    "DELETE /favorites/[barcode]",
    "DELETE /me",
    "DELETE /products/[barcode]/feedback",
    "DELETE /profiles/[id]",
    "DELETE /saved-products/[barcode]",
    "DELETE /shopping-list/items",
    "DELETE /shopping-list/items/[id]",
    "GET /config",
    "GET /favorites",
    "GET /me",
    "GET /me/export",
    "GET /products/[barcode]",
    "GET /products/[barcode]/alternatives",
    "GET /products/[barcode]/feedback",
    "GET /products/search",
    "GET /profiles",
    "GET /saved-products",
    "GET /scan-history",
    "GET /shopping-list",
    "PATCH /shopping-list/items/[id]",
    "POST /auth/apple",
    "POST /auth/forgot-password",
    "POST /auth/google",
    "POST /auth/login",
    "POST /auth/logout",
    "POST /auth/refresh",
    "POST /auth/register",
    "POST /auth/reset-password",
    "POST /products/[barcode]/explain",
    "POST /profiles",
    "POST /scan-history",
    "POST /shopping-list/items",
    "PUT /favorites/[barcode]",
    "PUT /products/[barcode]/feedback",
    "PUT /profiles/[id]",
    "PUT /saved-products/[barcode]",
].sort();

describe("mobile API surface (App Store guardrail)", () => {
    it("exposes exactly the reviewed endpoints", () => {
        expect(surface()).toEqual(ALLOWED);
    });

    it("has no endpoint that creates content other people can see, takes photos, or sells anything", () => {
        const forbidden = /(contribut|comment|review|report|upload|photo|image|label-scan|purchase|subscription|premium|checkout|payment|add-product)/i;
        const offenders = surface().filter((entry) => {
            const path = entry.split(" ")[1];
            return forbidden.test(path) || path === "/products"; // POST /products would add a product
        });
        expect(offenders).toEqual([]);
        // The only POST under /products is the AI explanation of an existing product.
        expect(surface().filter((e) => e.startsWith("POST /products"))).toEqual(["POST /products/[barcode]/explain"]);
        expect(surface().filter((e) => e.startsWith("PUT /products"))).toEqual(["PUT /products/[barcode]/feedback"]);
    });

    it("offers account deletion and both Apple and Google sign-in", () => {
        const s = surface();
        expect(s).toContain("DELETE /me");
        expect(s).toContain("POST /auth/apple");
        expect(s).toContain("POST /auth/google");
    });
});
