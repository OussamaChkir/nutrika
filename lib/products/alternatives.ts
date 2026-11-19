// Better alternatives (F2) for the mobile API. Same rules as the product page: offered for grade C or
// worse, or when the personal verdict is not good news; ranked on the personal score when a profile is active.

import { prisma } from "../db";
import { findAlternatives } from "../alternatives/find";
import { shouldOfferAlternatives, type Alternative } from "../alternatives/rank";
import { isOffTag } from "../off/search";
import { productFromStored } from "../product";
import { loadCatalogProduct } from "./catalog";
import { buildPersonalView } from "./personal";

export interface AlternativesAnswer {
    /** false: nothing to suggest for this product (grade A or B and no personal concern). */
    offered: boolean;
    items: Alternative[];
    /** Name of the profile the ranking used, or null for the universal score. */
    profileName: string | null;
    countryTag: string | null;
}

export async function loadAlternatives(
    barcode: string,
    options: { userId: string; isAdmin: boolean; activeProfileId: string | null }
): Promise<AlternativesAnswer | null> {
    const row = await loadCatalogProduct(barcode, { userId: options.userId, isAdmin: options.isAdmin });
    if (!row) return null;

    const normalized = productFromStored(row);
    let built: ReturnType<typeof buildPersonalView> = null;
    try {
        const rows = await prisma.profile.findMany({ where: { userId: options.userId }, orderBy: { createdAt: "asc" } });
        built = buildPersonalView(normalized, row.score, rows, options.activeProfileId);
    } catch (error) {
        console.error("Personal score unavailable:", error instanceof Error ? error.message : "unknown error");
    }

    const letter = row.scoreLetter as "A" | "B" | "C" | "D" | "E";
    const configured = process.env.ALTERNATIVES_COUNTRY?.trim().toLowerCase() || null;
    const countryTag = configured && isOffTag(configured) ? configured : null;

    if (!shouldOfferAlternatives({ letter, status: built?.view.verdict.status ?? null })) {
        return { offered: false, items: [], profileName: null, countryTag };
    }

    const items = await findAlternatives({
        current: normalized,
        currentScore: row.score,
        profile: built?.activeProfile ?? null,
        country: countryTag,
    });
    const profileName = built ? (built.view.everyone.find((r) => r.isActive)?.name ?? null) : null;
    return { offered: true, items, profileName, countryTag };
}
