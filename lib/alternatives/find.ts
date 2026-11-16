// F2: find alternatives for a scanned product. Orchestrates the pure ranking and the OFF fetch.
//
// Strategy, in plain words:
//   1. Look in the product's most specific categories first (up to 3), because the closer the
//      category, the more comparable the product. Results from a closer category come first.
//   2. If a country is configured, look for products sold there; when that gives fewer than
//      MIN_WANTED, widen to any country and let the card say "may not be sold near you".
//   3. Stop as soon as there are MAX_ALTERNATIVES.
// Network failures just mean fewer (or no) suggestions: never an error on the product page.

import { fetchAlternativeCandidates, isOffTag } from "../off/search";
import type { OFFProduct } from "../openfoodfacts";
import { normalizeOffProduct, type Product } from "../product";
import type { PersonalProfile } from "../profiles/constants";
import { MAX_ALTERNATIVES, rankAlternatives, type Alternative } from "./rank";

/** Below this many suggestions, a country-restricted search is widened to any country. */
export const MIN_WANTED = 3;
/** How many of the product's categories to try, most specific first. */
export const MAX_CATEGORIES = 3;

export interface FindInput {
    current: Product;
    currentScore: number;
    profile: PersonalProfile | null;
    /** OFF country tag such as "en:tunisia", or null to search everywhere. */
    country: string | null;
    fetchImpl?: typeof fetch;
}

type Fetcher = (query: { category: string; country?: string }, fetchImpl?: typeof fetch) => Promise<OFFProduct[]>;

async function collect(
    input: FindInput,
    country: string | undefined,
    already: Alternative[],
    fetchCandidates: Fetcher
): Promise<Alternative[]> {
    const found = [...already];
    const seen = new Set(found.map((a) => a.barcode));
    const categories = input.current.categoryTags.filter(isOffTag).slice(-MAX_CATEGORIES).reverse();

    for (const category of categories) {
        if (found.length >= MAX_ALTERNATIVES) break;
        const raw = await fetchCandidates({ category, country }, input.fetchImpl);
        const ranked = rankAlternatives({
            current: input.current,
            currentScore: input.currentScore,
            candidates: raw.map(normalizeOffProduct),
            profile: input.profile,
            limit: MAX_ALTERNATIVES,
        });
        for (const alt of ranked) {
            if (found.length >= MAX_ALTERNATIVES) break;
            if (seen.has(alt.barcode)) continue;
            seen.add(alt.barcode);
            found.push(alt);
        }
    }
    return found;
}

export async function findAlternatives(input: FindInput, fetchCandidates: Fetcher = fetchAlternativeCandidates): Promise<Alternative[]> {
    const country = input.country && isOffTag(input.country) ? input.country : undefined;
    let found = await collect(input, country, [], fetchCandidates);
    if (country && found.length < MIN_WANTED) {
        found = await collect(input, undefined, found, fetchCandidates);
    }
    return found;
}
