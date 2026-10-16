/**
 * Builds the evaluation set for the nutrika-ai service from real Open Food Facts products.
 *
 * Pure functions only (the network is injected), so everything here is unit-tested in
 * `golden.test.ts`. The command line wrapper is `export-golden.ts`.
 *
 * Why export from Nutrika instead of writing cases by hand: each case contains exactly the
 * facts the product page would send (score and grade from `calculateScore`, aspects translated
 * with the app's own messages), so the eval measures what users actually get.
 */
import { buildExplainPayload, isExplainableBarcode, type AiLocale } from "../lib/ai";
import { getProductName, type OFFProduct } from "../lib/openfoodfacts";
import type { ScoreMessageTranslator } from "../lib/score-messages";
import { calculateScore } from "../lib/scoring";

// ============================================
// TYPES
// ============================================

export interface GoldenCase {
    id: string;
    /** Allergens the service must report for this user, computed with the same rule as the service. */
    expect_alert: string[];
    request: ReturnType<typeof buildExplainPayload>;
}

export type SkipReason = "no_barcode" | "no_name" | "too_little_data";

export type Translators = Record<"en" | "fr", ScoreMessageTranslator>;

/**
 * Minimal translator for the `ScoreMessages` namespace, which only uses `{name}` placeholders.
 * It avoids loading next-intl (ESM-only) in a plain Node script; `golden.test.ts` checks that
 * it returns exactly what next-intl returns for every message in both languages.
 */
export function makeTranslator(messages: Record<string, string>): ScoreMessageTranslator {
    return (key, values) => {
        const template = messages[key];
        if (template === undefined) throw new Error(`Missing message: ${key}`);
        return template.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? ""));
    };
}

// ============================================
// CONFIG
// ============================================

/** Open Food Facts category tags: a spread of products where explanations differ a lot. */
export const DEFAULT_CATEGORIES = [
    "en:sodas",
    "en:breakfast-cereals",
    "en:yogurts",
    "en:salty-snacks",
    "en:chocolates",
    "en:fruit-juices",
    "en:cheeses",
    "en:breads",
    "en:biscuits",
    "en:pastas",
    "en:spreads",
    "en:waters",
];

/** Only what `calculateScore` and the payload builder read: keeps responses small. */
export const OFF_FIELDS = [
    "code",
    "product_name",
    "product_name_en",
    "brands",
    "nutriments",
    "ingredients_text",
    "ingredients_text_en",
    "ingredients_analysis_tags",
    "allergens_tags",
    "traces_tags",
    "additives_tags",
    "nova_group",
    "nutriscore_grade",
    "labels_tags",
    "categories_tags",
].join(",");

/** Cycle used to spread cases over languages. Arabic is not shipped in Nutrika yet, so the
 *  facts stay in English and the model has to answer in Arabic: a useful multilingual stress test. */
const LOCALE_CYCLE = ["en", "fr", "en", "fr", "ar"] as const;

// ============================================
// PURE LOGIC
// ============================================

/** Same matching rule as the service and the product page: case-insensitive substring. */
export function matchAllergies(allergies: string[], allergens: string[]): string[] {
    return allergens.filter((allergen) =>
        allergies.some((a) => a.trim() && allergen.toLowerCase().includes(a.trim().toLowerCase()))
    );
}

/**
 * Pick the simulated user's allergies so every behaviour is exercised:
 *  - every 3rd product with allergens: the user has one of them  -> an alert is expected
 *  - the next one: the user has an allergy the product does NOT contain -> no alert may appear
 *  - everything else: no allergies
 */
export function pickAllergies(index: number, allergens: string[]): string[] {
    if (allergens.length === 0) return [];
    if (index % 3 === 0) return [allergens[0]];
    if (index % 3 === 1) {
        const decoy = "sesame";
        return matchAllergies([decoy], allergens).length === 0 ? [decoy] : [];
    }
    return [];
}

const nutrientCount = (off: OFFProduct): number => {
    const n = off.nutriments ?? {};
    return [
        n.sugars_100g,
        n["saturated-fat_100g"],
        n.fat_100g,
        n.carbohydrates_100g,
        n.fiber_100g,
        n.proteins_100g,
        n.salt_100g,
    ].filter((v) => typeof v === "number" && Number.isFinite(v)).length;
};

/** Turn one Open Food Facts product into an eval case, or say why it was skipped. */
export function toGoldenCase(
    off: OFFProduct,
    index: number,
    translators: Translators
): { case: GoldenCase } | { skipped: SkipReason } {
    if (!off.code || !isExplainableBarcode(off.code)) return { skipped: "no_barcode" };

    const name = getProductName(off);
    if (name === "Unknown Product") return { skipped: "no_name" };
    // A product with almost no nutrition data produces a thin, uninformative case.
    if (nutrientCount(off) < 3) return { skipped: "too_little_data" };

    const scoreResult = calculateScore(off);
    const locale: AiLocale | "ar" = LOCALE_CYCLE[index % LOCALE_CYCLE.length];
    // Arabic cases reuse the English facts (there is no Arabic message file yet).
    const t = translators[locale === "fr" ? "fr" : "en"];
    const n = off.nutriments ?? {};

    const payload = buildExplainPayload(
        {
            barcode: off.code,
            name,
            brand: off.brands || null,
            score: scoreResult.score,
            scoreLetter: scoreResult.letter,
            positives: scoreResult.positives,
            negatives: scoreResult.negatives,
            allergens: scoreResult.allergens.map((a) => a.name),
            dietaryTags: scoreResult.dietaryTags,
            sugars: n.sugars_100g ?? null,
            saturatedFat: n["saturated-fat_100g"] ?? null,
            fat: n.fat_100g ?? null,
            carbohydrates: n.carbohydrates_100g ?? null,
            fiber: n.fiber_100g ?? null,
            proteins: n.proteins_100g ?? null,
            salt: n.salt_100g ?? null,
            offData: off as unknown as Record<string, unknown>,
        },
        // `buildExplainPayload` only accepts the locales Nutrika ships; "ar" is patched in below.
        locale === "ar" ? "en" : locale,
        t
    );

    const allergies = pickAllergies(index, payload.product.allergens);
    return {
        case: {
            id: `off-${off.code}`,
            expect_alert: matchAllergies(allergies, payload.product.allergens),
            request: { ...payload, locale: locale as AiLocale, user: { allergies } },
        },
    };
}

// ============================================
// DISCOVERY (network injected)
// ============================================

export interface DiscoverOptions {
    categories?: string[];
    perCategory?: number;
    country?: string;
    fetchImpl?: typeof fetch;
    /** Open Food Facts asks clients to stay under ~10 search requests a minute. */
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
    onWarn?: (message: string) => void;
}

export async function discoverProducts(options: DiscoverOptions = {}): Promise<OFFProduct[]> {
    const {
        categories = DEFAULT_CATEGORIES,
        perCategory = 5,
        country = "en:france",
        fetchImpl = fetch,
        delayMs = 6500,
        sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        onWarn = () => {},
    } = options;

    const found = new Map<string, OFFProduct>();

    for (const [i, category] of categories.entries()) {
        if (i > 0 && delayMs > 0) await sleep(delayMs);

        const params = new URLSearchParams({
            categories_tags: category,
            countries_tags: country,
            sort_by: "popularity",
            // Fetch extra: many popular products are filtered out for missing data.
            page_size: String(perCategory * 3),
            fields: OFF_FIELDS,
        });

        try {
            const res = await fetchImpl(`https://world.openfoodfacts.org/api/v2/search?${params}`, {
                headers: { "User-Agent": "Nutrika-eval/1.0 (contact@nutrika.app)" },
            });
            if (!res.ok) {
                onWarn(`${category}: HTTP ${res.status}`);
                continue;
            }
            const body = (await res.json()) as { products?: OFFProduct[] };
            let taken = 0;
            for (const product of body.products ?? []) {
                if (taken >= perCategory) break;
                if (!product.code || found.has(product.code)) continue;
                found.set(product.code, product);
                taken += 1;
            }
            if (taken === 0) onWarn(`${category}: no products returned`);
        } catch (error) {
            onWarn(`${category}: ${String(error)}`);
        }
    }

    return [...found.values()];
}

/** Build all cases; products that cannot make a good case are counted, not silently dropped. */
export function buildGoldenSet(products: OFFProduct[], translators: Translators) {
    const cases: GoldenCase[] = [];
    const skipped: Record<SkipReason, number> = { no_barcode: 0, no_name: 0, too_little_data: 0 };

    for (const product of products) {
        // Index by accepted cases so the language / allergy cycles stay evenly spread.
        const result = toGoldenCase(product, cases.length, translators);
        if ("skipped" in result) skipped[result.skipped] += 1;
        else cases.push(result.case);
    }
    return { cases, skipped };
}
