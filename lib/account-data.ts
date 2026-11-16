// Shape of the "download my data" file.
//
// Pure: it takes already-loaded rows and returns the JSON document. It lists fields
// explicitly (an allow-list), so a new column such as a password hash or token can never
// leak into an export by accident. Tested in lib/account-data.test.ts.

export const EXPORT_VERSION = 1;

interface Dated {
    toISOString(): string;
}

export interface ExportSource {
    user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        role: string;
        createdAt: Dated;
        weight: number | null;
        height: number | null;
        dateOfBirth: Dated | null;
        allergies: string[];
        scanInsightsOptIn?: boolean | null;
    };
    profiles: {
        id: string;
        name: string;
        ageBand: string;
        isDefault: boolean;
        conditions: string[];
        diets: string[];
        goals: string[];
        allergens: string[];
        allergenStrictness: string;
        consentedAt: Dated;
        createdAt: Dated;
    }[];
    scans: { scannedAt: Dated; product: { barcode: string; name: string; brand: string | null } }[];
    favorites: { createdAt: Dated; product: { barcode: string; name: string; brand: string | null } }[];
    savedProducts: { barcode: string; name: string; brand: string | null; state: string; createdAt: Dated }[];
    shoppingList: { barcode: string | null; label: string; quantity: number; checked: boolean; createdAt: Dated }[];
    scanEvents: {
        barcode: string;
        score: number;
        grade: string;
        sugar100: number | null;
        salt100: number | null;
        satFat100: number | null;
        protein100: number | null;
        nova: number | null;
        category: string | null;
        brand: string | null;
        profileId: string | null;
        createdAt: Dated;
    }[];
    labelScanUsage: { createdAt: Dated }[];
    feedbacks: { rating: number; comment: string | null; createdAt: Dated; product: { barcode: string; name: string } }[];
    contributions: { id: string; status: string; reason: string | null; changes: unknown; createdAt: Dated }[];
    productsAdded: { barcode: string; name: string; brand: string | null; status: string; createdAt: Dated }[];
}

const iso = (d: Dated | null): string | null => (d ? d.toISOString() : null);

export function buildAccountExport(src: ExportSource, now: Dated) {
    const product = (p: { barcode: string; name: string; brand?: string | null }) => ({
        barcode: p.barcode,
        name: p.name,
        ...(p.brand !== undefined ? { brand: p.brand } : {}),
    });
    return {
        exportVersion: EXPORT_VERSION,
        exportedAt: iso(now),
        account: {
            id: src.user.id,
            name: src.user.name,
            email: src.user.email,
            image: src.user.image,
            role: src.user.role,
            createdAt: iso(src.user.createdAt),
            weightKg: src.user.weight,
            heightCm: src.user.height,
            dateOfBirth: iso(src.user.dateOfBirth),
            allergies: src.user.allergies,
            scanInsights: src.user.scanInsightsOptIn === true,
        },
        personalProfiles: src.profiles.map((p) => ({
            id: p.id,
            nickname: p.name,
            ageBand: p.ageBand,
            isDefault: p.isDefault,
            conditions: p.conditions,
            diets: p.diets,
            goals: p.goals,
            allergens: p.allergens,
            allergenStrictness: p.allergenStrictness,
            consentedAt: iso(p.consentedAt),
            createdAt: iso(p.createdAt),
        })),
        scanHistory: src.scans.map((s) => ({ scannedAt: iso(s.scannedAt), ...product(s.product) })),
        favorites: src.favorites.map((f) => ({ addedAt: iso(f.createdAt), ...product(f.product) })),
        savedProducts: src.savedProducts.map((p) => ({
            ...product(p),
            state: p.state,
            savedAt: iso(p.createdAt),
        })),
        shoppingList: src.shoppingList.map((i) => ({
            barcode: i.barcode,
            label: i.label,
            quantity: i.quantity,
            checked: i.checked,
            addedAt: iso(i.createdAt),
        })),
        scanEvents: src.scanEvents.map((e) => ({
            scannedAt: iso(e.createdAt),
            barcode: e.barcode,
            score: e.score,
            grade: e.grade,
            sugarPer100: e.sugar100,
            saltPer100: e.salt100,
            saturatedFatPer100: e.satFat100,
            proteinPer100: e.protein100,
            nova: e.nova,
            category: e.category,
            brand: e.brand,
            profileId: e.profileId,
        })),
        // F5: only the time of each photo scan (kept 7 days); the photo and the result are never stored.
        photoScans: src.labelScanUsage.map((u) => ({ at: iso(u.createdAt) })),
        reviews: src.feedbacks.map((f) => ({
            rating: f.rating,
            comment: f.comment,
            createdAt: iso(f.createdAt),
            ...product(f.product),
        })),
        contributions: src.contributions.map((c) => ({
            id: c.id,
            status: c.status,
            reason: c.reason,
            changes: c.changes,
            createdAt: iso(c.createdAt),
        })),
        productsAdded: src.productsAdded.map((p) => ({
            ...product(p),
            status: p.status,
            createdAt: iso(p.createdAt),
        })),
    };
}
