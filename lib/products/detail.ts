// The product answer for the mobile app (GET /api/v1/products/{barcode}). Pure assembly: the route
// loads rows, this module shapes them. Texts are NOT translated here: the app has the same message
// keys as the website (`ScoreMessages`, `Profile`, ...) and translates them itself.

import { forYouNotes, getAdditiveInfo, productAdditiveCodes, buildIndex, type AdditiveView } from "../additives/lookup";
import { ADDITIVES } from "../additives/registry";
import type { AdditiveLocale } from "../additives/schema";
import type { Product } from "../product";
import type { PersonalProfile } from "../profiles/constants";
import type { ScoreAspect } from "../scoring";
import { buildScanFlags, type ScanFlag } from "../shopping/flags";
import type { SavedState } from "../shopping/rules";
import { compareWithUsual, type Comparable } from "../shopping/usual";
import type { PersonalView } from "./personal";

/** The catalogue row fields the answer needs. */
export interface CatalogRow {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    status: string;
    score: number;
    scoreLetter: unknown;
    scoreColor: string;
    allergens: string[];
    allergensSeverity: unknown;
    dietaryTags: string[];
    energy: number | null;
    fat: number | null;
    saturatedFat: number | null;
    carbohydrates: number | null;
    sugars: number | null;
    fiber: number | null;
    proteins: number | null;
    salt: number | null;
    manufacturingPlaces: string | null;
    origins: string | null;
}

export interface ShoppingState {
    state: SavedState | null;
    onList: boolean;
    flags: ScanFlag[];
}

export interface AdditiveEntry {
    code: string;
    /** null = no reviewed explanation for this code (yet). */
    info: AdditiveView | null;
    /** Extra notes for the active profile (e.g. a condition that makes this additive worth knowing about). */
    forYou: string[];
}

export interface ProductDetail {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    /** APPROVED for normal products. PENDING when the signed-in user added it and it awaits review. */
    status: string;
    score: { value: number; letter: string; color: string };
    positives: ScoreAspect[];
    negatives: ScoreAspect[];
    allergens: Array<{ name: string; severity: string }>;
    /** Allergens from the user's older account-level allergy list that this product contains. */
    allergyAlert: string[];
    dietaryTags: string[];
    nutrients: {
        energy: number | null;
        fat: number | null;
        saturatedFat: number | null;
        carbohydrates: number | null;
        sugars: number | null;
        fiber: number | null;
        proteins: number | null;
        salt: number | null;
    };
    nova: number | null;
    nutriscoreGrade: string | null;
    ecoscoreGrade: string | null;
    labels: Product["labels"];
    ingredientsStatus: Product["ingredientsStatus"];
    manufacturingPlaces: string | null;
    origins: string | null;
    /** Source data last edited (unix seconds), so the app can show how fresh it is. */
    lastModified: number | null;
    isFavorite: boolean;
    /** null: flag off, no profile yet, or it could not be computed. The app then shows only the universal score. */
    personal: PersonalView | null;
    /** null: flag off or it could not be computed. */
    shopping: ShoppingState | null;
    /** Empty unless the flag is on and at least one additive has a reviewed explanation. */
    additives: AdditiveEntry[];
    /** Raw additive codes (E-numbers), always present. */
    additiveCodes: string[];
}

export interface DetailInput {
    row: CatalogRow;
    normalized: Product;
    positives: ScoreAspect[];
    negatives: ScoreAspect[];
    isFavorite: boolean;
    /** Account-level allergy list (older feature), lower or mixed case. */
    legacyAllergies: readonly string[];
    personal: PersonalView | null;
    activeProfile: PersonalProfile | null;
    shopping: ShoppingState | null;
    additiveLocale: AdditiveLocale;
    additivesEnabled: boolean;
    includeDraftAdditives: boolean;
}

export function buildProductDetail(input: DetailInput): ProductDetail {
    const { row, normalized } = input;

    const allergens = row.allergens.map((name) => ({ name, severity: String(row.allergensSeverity) }));
    const allergyAlert = allergens
        .filter((a) => input.legacyAllergies.some((ua) => a.name.toLowerCase().includes(ua.toLowerCase())))
        .map((a) => a.name);

    const additiveCodes = productAdditiveCodes(normalized.additives);
    let additives: AdditiveEntry[] = [];
    if (input.additivesEnabled) {
        const index = buildIndex(ADDITIVES);
        additives = additiveCodes.map((code) => {
            const info = getAdditiveInfo(index, code, input.additiveLocale, { includeDrafts: input.includeDraftAdditives });
            return { code, info, forYou: info ? forYouNotes(info, input.activeProfile) : [] };
        });
        // Until at least one additive has a reviewed explanation, a list of "no explanation yet" is noise.
        if (!additives.some((a) => a.info)) additives = [];
    }

    return {
        barcode: row.barcode,
        name: row.name,
        brand: row.brand,
        imageUrl: row.imageUrl,
        status: row.status,
        score: { value: row.score, letter: String(row.scoreLetter), color: row.scoreColor },
        positives: input.positives,
        negatives: input.negatives,
        allergens,
        allergyAlert,
        dietaryTags: row.dietaryTags ?? [],
        nutrients: {
            energy: row.energy,
            fat: row.fat,
            saturatedFat: row.saturatedFat,
            carbohydrates: row.carbohydrates,
            sugars: row.sugars,
            fiber: row.fiber,
            proteins: row.proteins,
            salt: row.salt,
        },
        nova: normalized.novaGroup ?? null,
        nutriscoreGrade: normalized.nutriscoreGrade ?? null,
        ecoscoreGrade: normalized.ecoscoreGrade ?? null,
        labels: normalized.labels,
        ingredientsStatus: normalized.ingredientsStatus,
        manufacturingPlaces: row.manufacturingPlaces,
        origins: row.origins,
        lastModified: normalized.lastModified ?? null,
        isFavorite: input.isFavorite,
        personal: input.personal,
        shopping: input.shopping,
        additives,
        additiveCodes,
    };
}

/** F3 flags from the user's own choices. `peers` = the user's approved products in the same category. */
export function buildShoppingState(input: {
    barcode: string;
    category: string | null;
    sugars: number | null;
    salt: number | null;
    saturatedFat: number | null;
    state: SavedState | null;
    onList: boolean;
    peers: readonly Comparable[];
    verdictStatus: PersonalView["verdict"]["status"] | null;
}): ShoppingState {
    const comparisons = compareWithUsual(
        { barcode: input.barcode, category: input.category, sugars: input.sugars, salt: input.salt, saturatedFat: input.saturatedFat },
        input.peers
    );
    return {
        state: input.state,
        onList: input.onList,
        flags: buildScanFlags({ state: input.state, comparisons, verdictStatus: input.verdictStatus }),
    };
}
