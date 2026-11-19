// Database side of GET /api/v1/products/{barcode}: loads what depends on the signed-in user
// (favorite, profiles, approved/avoid choices, shopping list) and hands it to buildProductDetail.
// Each optional part fails on its own: a problem in one never breaks the product answer.

import { prisma } from "../db";
import { isFeatureEnabled } from "../flags";
import { productFromStored } from "../product";
import { parseScoreAspects } from "../score-messages";
import { MAX_COMPARE_PRODUCTS, parseSavedState } from "../shopping/rules";
import { loadCatalogProduct } from "./catalog";
import { buildProductDetail, buildShoppingState, type ProductDetail, type ShoppingState } from "./detail";
import { buildPersonalView, type PersonalView } from "./personal";

export interface LoadDetailOptions {
    userId: string;
    isAdmin: boolean;
    /** From X-Profile-Id. Only a hint. */
    activeProfileId: string | null;
    locale: "en" | "fr";
}

export async function loadProductDetail(barcode: string, options: LoadDetailOptions): Promise<ProductDetail | null> {
    const { userId } = options;
    const row = await loadCatalogProduct(barcode, { userId, isAdmin: options.isAdmin });
    if (!row) return null;

    const normalized = productFromStored(row);

    const [isFavorite, legacyAllergies] = await Promise.all([
        prisma.favorite
            .findUnique({ where: { userId_productId: { userId, productId: row.id } }, select: { id: true } })
            .then((f) => f !== null)
            .catch(() => false),
        prisma.user
            .findUnique({ where: { id: userId }, select: { allergies: true } })
            .then((u) => u?.allergies ?? [])
            .catch(() => [] as string[]),
    ]);

    // "Score for you" (F1) and allergen findings (F7), behind a flag.
    let personal: PersonalView | null = null;
    let activeProfile = null;
    if (isFeatureEnabled("personalScore")) {
        try {
            const profileRows = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
            const built = buildPersonalView(normalized, row.score, profileRows, options.activeProfileId);
            if (built) {
                personal = built.view;
                activeProfile = built.activeProfile;
            }
        } catch (error) {
            console.error("Personal score unavailable:", error instanceof Error ? error.message : "unknown error");
        }
    }

    // Approve / Add to list / Avoid and the flags from the user's own choices (F3), behind a flag.
    let shopping: ShoppingState | null = null;
    if (isFeatureEnabled("shoppingList")) {
        try {
            const tags = normalized.categoryTags;
            const category = tags.length > 0 ? tags[tags.length - 1] : null;
            const [saved, peers, listed] = await Promise.all([
                prisma.savedProduct.findUnique({
                    where: { userId_barcode: { userId, barcode: row.barcode } },
                    select: { state: true },
                }),
                category
                    ? prisma.savedProduct.findMany({
                          where: { userId, state: "approved", category },
                          orderBy: { updatedAt: "desc" },
                          take: MAX_COMPARE_PRODUCTS,
                          select: { barcode: true, category: true, sugars: true, salt: true, saturatedFat: true },
                      })
                    : Promise.resolve([]),
                prisma.shoppingListItem.count({ where: { userId, barcode: row.barcode, checked: false } }),
            ]);
            shopping = buildShoppingState({
                barcode: row.barcode,
                category,
                sugars: row.sugars,
                salt: row.salt,
                saturatedFat: row.saturatedFat,
                state: parseSavedState(saved?.state),
                onList: listed > 0,
                peers,
                verdictStatus: personal?.verdict.status ?? null,
            });
        } catch (error) {
            console.error("Shopping list unavailable:", error instanceof Error ? error.message : "unknown error");
        }
    }

    return buildProductDetail({
        row,
        normalized,
        positives: parseScoreAspects(row.positives),
        negatives: parseScoreAspects(row.negatives),
        isFavorite,
        legacyAllergies,
        personal,
        activeProfile,
        shopping,
        additiveLocale: options.locale,
        additivesEnabled: isFeatureEnabled("ingredientExplanations"),
        includeDraftAdditives: process.env.NODE_ENV !== "production",
    });
}
