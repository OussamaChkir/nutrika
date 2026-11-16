// F8 offline mode, in a real browser with the network switched off (context.setOffline).
//
// Needs the app running with NEXT_PUBLIC_FF_OFFLINE_MODE=1 (see playwright.config.ts). The
// service worker is not involved here: it only exists in production builds, so the "fallback
// page" test imitates what the service worker does (answer a failed product navigation with the
// offline page) and the rest checks the parts that do not depend on it.
//
// The product is put straight into IndexedDB, with the same schema as lib/offline/store.ts, so
// these tests do not need a database or a network.

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const KNOWN = "20000001";
const UNKNOWN = "20000009";
const DAY = 24 * 60 * 60 * 1000;

const product = (barcode: string, name: string, over: Record<string, unknown> = {}) => ({
    barcode,
    name,
    brand: "Example Brand",
    imageUrl: null,
    nutrients: { sugars: 32, salt: 0.7, saturatedFat: 9, fat: 22, carbohydrates: 62, proteins: 6 },
    additives: [],
    allergens: ["peanuts"],
    traces: [],
    labels: { organic: false, fairTrade: false, vegan: false, vegetarian: false, lactoseFree: false, glutenFree: false },
    categoryTags: ["en:biscuits"],
    ingredientsText: "Flour, sugar, palm oil, peanuts, salt",
    ingredientsAnalysisTags: [],
    ingredientsStatus: "usable",
    countriesTags: [],
    ...over,
});

/** Writes into the app's own IndexedDB (same names and stores as lib/offline/store.ts). */
async function seed(page: Page, data: { products: unknown[]; profiles: unknown[]; activeId: string | null }) {
    await page.evaluate(async ({ products, profiles, activeId }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open("nutrika-offline", 1);
            req.onupgradeneeded = () => {
                const d = req.result;
                d.createObjectStore("products", { keyPath: "barcode" }).createIndex("lastUsedAt", "lastUsedAt");
                d.createObjectStore("profiles", { keyPath: "id" });
                d.createObjectStore("pending", { keyPath: "barcode" });
                d.createObjectStore("meta", { keyPath: "key" });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const tx = db.transaction(["products", "profiles", "pending", "meta"], "readwrite");
        for (const s of ["products", "profiles", "pending", "meta"]) tx.objectStore(s).clear();
        for (const p of products) tx.objectStore("products").put(p);
        for (const p of profiles) tx.objectStore("profiles").put(p);
        if (activeId) tx.objectStore("meta").put({ key: "activeProfileId", value: activeId });
        await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
        db.close();
    }, data);
}

const peanutProfile = {
    id: "p1",
    name: "Sami",
    isDefault: true,
    profile: { conditions: [], diets: [], goals: [], allergens: ["Peanuts"], allergenStrictness: "avoid_traces", ageBand: "adult" },
};
const cached = (p: ReturnType<typeof product>, ageMs: number) => ({ barcode: p.barcode, product: p, fetchedAt: Date.now() - ageMs, lastUsedAt: Date.now() - ageMs, source: "scan" });


/**
 * A signed-in session without a database: the app uses JWT sessions, so a cookie signed with the
 * server's AUTH_SECRET is enough. Set E2E_AUTH_SECRET to the same value as the app's AUTH_SECRET
 * (never use a production secret for this: run the app locally or on a throwaway preview).
 */
async function signIn(context: BrowserContext, baseURL: string) {
    const secret = process.env.E2E_AUTH_SECRET;
    if (!secret) return false;
    const { encode } = await import("@auth/core/jwt");
    const name = baseURL.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token";
    const token = await encode({ token: { id: "e2e-user", sub: "e2e-user", role: "USER", email: "e2e@example.com", name: "E2E" }, secret, salt: name });
    await context.addCookies([{ name, value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    return true;
}

async function countStored(page: Page, store: "products" | "profiles" | "pending") {
    return page.evaluate(async (s) => {
        const db = await new Promise<IDBDatabase>((r) => { const q = indexedDB.open("nutrika-offline", 1); q.onsuccess = () => r(q.result); });
        return await new Promise<number>((r) => { const q = db.transaction(s).objectStore(s).count(); q.onsuccess = () => r(q.result); });
    }, store);
}

async function scanManually(page: Page, barcode: string) {
    await page.getByRole("button", { name: /manual|enter|type|saisir/i }).first().click();
    await page.getByRole("textbox").first().fill(barcode);
    await page.keyboard.press("Enter");
}

async function openScanAndSeed(page: Page, withProfile = true) {
    await page.goto("/en/scan");
    await seed(page, { products: [cached(product(KNOWN, "Chocolate biscuit"), 3 * DAY)], profiles: withProfile ? [peanutProfile] : [], activeId: withProfile ? "p1" : null });
}

test("signed in, airplane mode: a saved product shows the full verdict for the saved profile", async ({ page, context, baseURL }) => {
    test.skip(!process.env.E2E_AUTH_SECRET, "set E2E_AUTH_SECRET (the app's AUTH_SECRET) to run the signed-in test");
    await signIn(context, baseURL!);
    await openScanAndSeed(page);
    await context.setOffline(true);
    await expect(page.getByText("Offline", { exact: true }).first()).toBeVisible();
    await scanManually(page, KNOWN);
    await expect(page.getByText("Chocolate biscuit")).toBeVisible();
    await expect(page.getByText(/saved on this device 3 days ago/i)).toBeVisible();
    // Peanut allergy + a product that contains peanuts: never a green result.
    await expect(page.getByText("Score for you")).toBeVisible();
    await expect(page.getByText("Contains Peanuts").first()).toBeVisible();
    await expect(page.getByText("Not suitable").first()).toBeVisible();
    await expect(page.getByText("Good match")).toHaveCount(0);
});

test("signed in: an incomplete ingredient list is never a good match offline", async ({ page, context, baseURL }) => {
    test.skip(!process.env.E2E_AUTH_SECRET, "set E2E_AUTH_SECRET to run the signed-in tests");
    await signIn(context, baseURL!);
    await page.goto("/en/scan");
    await seed(page, { products: [cached(product(KNOWN, "Mystery spread", { allergens: [], ingredientsText: "Sugar", ingredientsStatus: "incomplete" }), 0)], profiles: [peanutProfile], activeId: "p1" });
    await context.setOffline(true);
    await scanManually(page, KNOWN);
    await expect(page.getByText("Cannot verify").first()).toBeVisible();
    await expect(page.getByText("Good match")).toHaveCount(0);
});

test("signed out (or after sign-out): the profile copy on the device is removed, only the universal score shows", async ({ page, context }) => {
    await openScanAndSeed(page); // seeded with a profile, but nobody is signed in
    await page.reload(); // on every page load the layout notices nobody is signed in and wipes the copy
    await expect.poll(() => countStored(page, "profiles")).toBe(0);
    expect(await countStored(page, "products")).toBe(1); // public catalogue data stays
    await context.setOffline(true);
    await scanManually(page, KNOWN);
    await expect(page.getByText("Chocolate biscuit")).toBeVisible();
    await expect(page.getByText(/saved on this device 3 days ago/i)).toBeVisible();
    await expect(page.getByText("Score for you")).toHaveCount(0);
});

test("airplane mode: an unknown barcode is queued and says it is not saved", async ({ page, context }) => {
    await openScanAndSeed(page, false);
    await context.setOffline(true);
    await scanManually(page, UNKNOWN);
    await expect(page.getByText(/not saved on this device/i)).toBeVisible();
    const queued = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((r) => { const q = indexedDB.open("nutrika-offline", 1); q.onsuccess = () => r(q.result); });
        return await new Promise<string[]>((r) => { const q = db.transaction("pending").objectStore("pending").getAllKeys(); q.onsuccess = () => r(q.result as string[]); });
    });
    expect(queued).toEqual([UNKNOWN]);
});

test("back online: the queued barcode is looked up, saved, and the user is told", async ({ page, context }) => {
    await openScanAndSeed(page, false);
    await context.setOffline(true);
    await scanManually(page, UNKNOWN);
    await expect(page.getByText(/not saved on this device/i)).toBeVisible();

    await page.route(`**/api/offline/product/${UNKNOWN}`, (route) =>
        route.fulfill({ json: { product: product(UNKNOWN, "Hummus", { allergens: ["sesame"], ingredientsText: "Chickpeas, tahini" }) } })
    );
    await context.setOffline(false);
    await expect(page.getByText(/1 product you scanned offline is ready/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /view hummus/i })).toBeVisible();
});

test("the offline page rebuilds a product page from the device (what the service worker serves)", async ({ page, context }) => {
    await openScanAndSeed(page, false);
    const offlineHtml = await (await page.request.get("/en/offline")).text();
    await page.route(`**/en/product/${KNOWN}`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: offlineHtml }));
    await page.goto(`/en/product/${KNOWN}`);
    await context.setOffline(true);
    await expect(page.getByText("Chocolate biscuit")).toBeVisible();
});
