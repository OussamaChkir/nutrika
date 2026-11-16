// Open Food Facts search for alternative candidates (F2).
//
// Rules of the road: a descriptive User-Agent, only the fields we need, a short timeout with one
// retry, and aggressive caching (24 h per category and country). Never call it on every render
// without the cache: the fetch below is cached by Next, so repeat views cost nothing.
// Failures return an empty list: alternatives are a bonus and must never break the product page.

import { OFF_BASE_URL, OFF_USER_AGENT, type OFFProduct } from "../openfoodfacts";

const FIELDS = [
    "code",
    "product_name",
    "product_name_en",
    "brands",
    "image_front_url",
    "image_front_small_url",
    "image_url",
    "nutriments",
    "nutriscore_grade",
    "nova_group",
    "ecoscore_grade",
    "additives_tags",
    "allergens_tags",
    "traces_tags",
    "ingredients_text",
    "ingredients_text_en",
    "ingredients_analysis_tags",
    "labels_tags",
    "categories_tags",
    "countries_tags",
    "states_tags",
    "last_modified_t",
].join(",");

const TIMEOUT_MS = 4000;
const REVALIDATE_SECONDS = 60 * 60 * 24;
/** Ask for more than we show: the ranking drops many (not better, not suitable, thin data). */
const PAGE_SIZE = 40;

/** Only OFF tags like "en:breakfast-cereals" or "en:tunisia" go into the query. */
export function isOffTag(value: string): boolean {
    return /^[a-z]{2}:[a-z0-9-]{1,80}$/.test(value);
}

export interface CandidateQuery {
    /** Most specific category tag, e.g. "en:chocolate-spreads". */
    category: string;
    /** Optional country tag, e.g. "en:tunisia". */
    country?: string | null;
}

export function buildCandidateUrl({ category, country }: CandidateQuery): string | null {
    if (!isOffTag(category) || (country && !isOffTag(country))) return null;
    const params = new URLSearchParams({
        categories_tags: category,
        sort_by: "popularity_key",
        page_size: String(PAGE_SIZE),
        fields: FIELDS,
    });
    if (country) params.set("countries_tags", country);
    return `${OFF_BASE_URL}/search?${params.toString()}`;
}

export async function fetchAlternativeCandidates(
    query: CandidateQuery,
    fetchImpl: typeof fetch = fetch
): Promise<OFFProduct[]> {
    const url = buildCandidateUrl(query);
    if (!url) return [];

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetchImpl(url, {
                headers: { "User-Agent": OFF_USER_AGENT },
                signal: AbortSignal.timeout(TIMEOUT_MS),
                next: { revalidate: REVALIDATE_SECONDS },
            });
            // Rate limited or server error: do not hammer, try once more only for transient errors.
            if (response.status === 429) return [];
            if (!response.ok) continue;
            const data: unknown = await response.json();
            const products = (data as { products?: unknown }).products;
            return Array.isArray(products) ? (products as OFFProduct[]).filter((p) => typeof p?.code === "string") : [];
        } catch {
            // timeout or network error: retry once
        }
    }
    return [];
}
