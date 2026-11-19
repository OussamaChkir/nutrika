import { describe, expect, it } from "vitest";

import { failureFor, type ServiceErrorName } from "./errors";
import { readProfileHeader } from "./profile-header";
import { barcodeParam, feedbackBody, savedStateBody, scanBody, shoppingAddBody, shoppingPatchBody } from "./schemas";

describe("failureFor", () => {
    const cases: Array<[ServiceErrorName, number, string]> = [
        ["invalid", 400, "invalid_request"],
        ["not_found", 404, "not_found"],
        ["limit", 409, "limit_reached"],
        ["unauthorized", 401, "unauthorized"],
        ["disabled", 404, "feature_disabled"],
        ["failed", 500, "server_error"],
    ];
    it.each(cases)("maps %s to %i %s", (name, status, code) => {
        expect(failureFor(name)).toMatchObject({ status, code });
    });

    it("falls back to a 500 for an unknown name instead of throwing", () => {
        expect(failureFor("weird" as ServiceErrorName).status).toBe(500);
    });
});

describe("readProfileHeader", () => {
    const req = (value?: string) => new Request("https://x.test", { headers: value === undefined ? {} : { "X-Profile-Id": value } });
    it("accepts a 24 hex character id", () => {
        expect(readProfileHeader(req("65a1b2c3d4e5f6a7b8c9d0e1"))).toBe("65a1b2c3d4e5f6a7b8c9d0e1");
        expect(readProfileHeader(req("  65a1b2c3d4e5f6a7b8c9d0e1 "))).toBe("65a1b2c3d4e5f6a7b8c9d0e1");
    });
    it("ignores anything else, so a bad header can never reach a query", () => {
        expect(readProfileHeader(req())).toBeNull();
        expect(readProfileHeader(req(""))).toBeNull();
        expect(readProfileHeader(req("not-an-id"))).toBeNull();
        expect(readProfileHeader(req("{$ne:null}"))).toBeNull();
    });
});

describe("request schemas", () => {
    it("barcodeParam is digits only, 6 to 14 long", () => {
        expect(barcodeParam.safeParse("3017620422003").success).toBe(true);
        for (const bad of ["12345", "123456789012345", "abc12345", "3017 620", ""]) {
            expect(barcodeParam.safeParse(bad).success).toBe(false);
        }
        expect(scanBody.safeParse({ barcode: "3017620422003" }).success).toBe(true);
        expect(scanBody.safeParse({}).success).toBe(false);
    });

    it("ratings are stars only: free text is rejected (no user-generated content from the app, App Store 1.2)", () => {
        expect(feedbackBody.safeParse({ rating: 4 }).success).toBe(true);
        expect(feedbackBody.safeParse({ rating: 4, comment: "great" }).success).toBe(false);
        expect(feedbackBody.safeParse({ rating: 0 }).success).toBe(false);
        expect(feedbackBody.safeParse({ rating: 6 }).success).toBe(false);
        expect(feedbackBody.safeParse({ rating: 3.5 }).success).toBe(false);
    });

    it("saved state accepts only approved or avoid", () => {
        expect(savedStateBody.safeParse({ state: "approved" }).success).toBe(true);
        expect(savedStateBody.safeParse({ state: "avoid" }).success).toBe(true);
        expect(savedStateBody.safeParse({ state: "love" }).success).toBe(false);
    });

    it("shopping add needs a barcode or a non-empty label", () => {
        expect(shoppingAddBody.safeParse({ barcode: "3017620422003" }).success).toBe(true);
        expect(shoppingAddBody.safeParse({ label: "bread", quantity: 2 }).success).toBe(true);
        expect(shoppingAddBody.safeParse({ label: "   " }).success).toBe(false);
        expect(shoppingAddBody.safeParse({}).success).toBe(false);
        expect(shoppingAddBody.safeParse({ label: "x", quantity: 0 }).success).toBe(false);
        expect(shoppingAddBody.safeParse({ label: "x", quantity: 100 }).success).toBe(false);
        expect(shoppingAddBody.safeParse({ label: "x", quantity: 1.5 }).success).toBe(false);
    });

    it("shopping patch needs quantity and/or checked", () => {
        expect(shoppingPatchBody.safeParse({ checked: true }).success).toBe(true);
        expect(shoppingPatchBody.safeParse({ quantity: 3, checked: false }).success).toBe(true);
        expect(shoppingPatchBody.safeParse({}).success).toBe(false);
        expect(shoppingPatchBody.safeParse({ checked: "yes" }).success).toBe(false);
    });
});
