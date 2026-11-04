import { describe, expect, it } from "vitest";

import { buildAccountExport, type ExportSource } from "./account-data";

const d = (s: string) => new Date(s);

const source: ExportSource = {
    user: {
        id: "u1",
        name: "Sara",
        email: "sara@example.com",
        image: null,
        role: "USER",
        createdAt: d("2026-01-01T00:00:00Z"),
        weight: 60,
        height: 170,
        dateOfBirth: d("1990-05-05T00:00:00Z"),
        allergies: ["Soy"],
    },
    profiles: [
        {
            id: "p1",
            name: "Yassine",
            ageBand: "child",
            isDefault: true,
            conditions: [],
            diets: [],
            goals: [],
            allergens: ["Peanuts"],
            allergenStrictness: "avoid_traces",
            consentedAt: d("2026-02-01T00:00:00Z"),
            createdAt: d("2026-02-01T00:00:00Z"),
        },
    ],
    scans: [{ scannedAt: d("2026-03-01T10:00:00Z"), product: { barcode: "123", name: "Spread", brand: "B" } }],
    favorites: [],
    savedProducts: [{ barcode: "123", name: "Spread", brand: "B", state: "avoid", createdAt: d("2026-03-03T00:00:00Z") }],
    shoppingList: [{ barcode: null, label: "Bread", quantity: 2, checked: false, createdAt: d("2026-03-04T00:00:00Z") }],
    scanEvents: [{ barcode: "123", score: 40, grade: "D", sugar100: 30, salt100: 0.4, satFat100: 8, protein100: 6, nova: 4, category: "en:biscuits", brand: "B", profileId: null, createdAt: d("2026-03-05T00:00:00Z") }],
    feedbacks: [{ rating: 4, comment: "ok", createdAt: d("2026-03-02T00:00:00Z"), product: { barcode: "123", name: "Spread" } }],
    contributions: [],
    productsAdded: [],
};

describe("buildAccountExport", () => {
    const out = buildAccountExport(source, d("2026-11-02T00:00:00Z"));

    it("includes the user's own data, including health profiles and consent date", () => {
        expect(out.account.email).toBe("sara@example.com");
        expect(out.personalProfiles[0]).toMatchObject({
            nickname: "Yassine",
            allergens: ["Peanuts"],
            consentedAt: "2026-02-01T00:00:00.000Z",
        });
        expect(out.scanHistory[0]).toMatchObject({ barcode: "123", scannedAt: "2026-03-01T10:00:00.000Z" });
        expect(out.exportedAt).toBe("2026-11-02T00:00:00.000Z");
    });

    it("includes saved products and the shopping list", () => {
        expect(out.savedProducts[0]).toMatchObject({ barcode: "123", state: "avoid", savedAt: "2026-03-03T00:00:00.000Z" });
        expect(out.shoppingList[0]).toEqual({
            barcode: null,
            label: "Bread",
            quantity: 2,
            checked: false,
            addedAt: "2026-03-04T00:00:00.000Z",
        });
    });

    it("includes scan records for insights, and whether insights are on", () => {
        expect(out.scanEvents[0]).toMatchObject({ barcode: "123", scannedAt: "2026-03-05T00:00:00.000Z", sugarPer100: 30, nova: 4 });
        expect(out.account.scanInsights).toBe(false);
        const on = buildAccountExport({ ...source, user: { ...source.user, scanInsightsOptIn: true } }, d("2026-11-02T00:00:00Z"));
        expect(on.account.scanInsights).toBe(true);
    });

    it("never contains secrets, even if the loaded rows carry extra fields", () => {
        const dirty = {
            ...source,
            user: { ...source.user, passwordHash: "$2a$10$secret", refresh_token: "refresh-token-xyz" },
        } as ExportSource;
        const json = JSON.stringify(buildAccountExport(dirty, d("2026-11-02T00:00:00Z")));
        expect(json).not.toContain("secret");
        expect(json).not.toContain("passwordHash");
        expect(json).not.toContain("refresh-token-xyz");
    });

    it("handles an empty account", () => {
        const empty = buildAccountExport(
            { ...source, profiles: [], scans: [], feedbacks: [], user: { ...source.user, dateOfBirth: null } },
            d("2026-11-02T00:00:00Z")
        );
        expect(empty.personalProfiles).toEqual([]);
        expect(empty.account.dateOfBirth).toBeNull();
    });
});
