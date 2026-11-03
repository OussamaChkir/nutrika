// F3: group list items by aisle, from Open Food Facts category tags. Pure.
//
// Tags run from general to specific ("en:snacks", "en:biscuits", "en:chocolate-biscuits"), so
// the three most specific are checked first and the first tag that matches a rule decides. Rule
// order matters ("peanut-butter" is a spread, not dairy; "fruit-juices" are drinks, not produce).
// Free-text items and anything unknown go to "other". Not a perfect taxonomy: a good-enough
// default that the user never has to maintain.

export const AISLES = ["produce", "bakery", "dairy", "meat_fish", "pantry", "snacks", "drinks", "frozen", "other"] as const;
export type Aisle = (typeof AISLES)[number];

/** Words are matched whole, between hyphens: "salt" matches "salt" but not "salted". */
const words = (list: string) => new RegExp(`(^|-)(${list})(-|$)`);

const RULES: readonly { aisle: Aisle; pattern: RegExp }[] = [
    { aisle: "frozen", pattern: words("frozen|ice-creams?|sorbets?") },
    { aisle: "pantry", pattern: words("spreads?|jams?|marmalades?|honeys?|peanut-butters?|nut-butters?") },
    { aisle: "dairy", pattern: words("dairies|dairy|milks?|cheeses?|yogh?o?u?rts?|creams?|butters?|eggs?|kefirs?") },
    { aisle: "drinks", pattern: words("beverages?|drinks?|juices?|sodas?|waters?|colas?|teas?|coffees?|beers?|wines?|smoothies|lemonades?") },
    { aisle: "meat_fish", pattern: words("meats?|poultry|chickens?|beef|pork|sausages?|hams?|fish|seafoods?|tunas?|salmons?|sardines?|charcuteries?") },
    { aisle: "bakery", pattern: words("breads?|baguettes?|pastry|pastries|croissants?|viennoiseries?|cakes?|brioches?|buns?") },
    { aisle: "snacks", pattern: words("snacks?|biscuits?|cookies?|chocolates?|candy|candies|confectioneries|confectionery|sweets?|crisps|chips|crackers?|bars?|wafers?|desserts?") },
    { aisle: "pantry", pattern: words("sauces?|condiments?|ketchups?|mayonnaises?|vinegars?|oils?|spices?|salts?|sugars?|flours?|pastas?|rice|noodles?|cereals?|breakfasts?|canned|conserves?|legumes?|beans|lentils|chickpeas|soups?|nuts?|dried|seeds?") },
    { aisle: "produce", pattern: words("fruits?|vegetables?|salads?|herbs?|mushrooms?|potatoes|tomatoes") },
];

const stripLang = (tag: string) => tag.replace(/^[a-z]{2,3}:/i, "").toLowerCase();

/** The aisle for a list of category tags (general to specific) or a single tag. */
export function aisleFor(categoryTags: readonly string[] | string | null | undefined): Aisle {
    const tags = typeof categoryTags === "string" ? [categoryTags] : [...(categoryTags ?? [])];
    for (const tag of tags.slice(-3).reverse()) {
        const name = stripLang(tag);
        for (const rule of RULES) if (rule.pattern.test(name)) return rule.aisle;
    }
    return "other";
}

export interface Aisled {
    category?: string | null;
}

/** Items grouped in aisle order, empty aisles left out. Item order inside an aisle is kept. */
export function groupByAisle<T extends Aisled>(items: readonly T[]): { aisle: Aisle; items: T[] }[] {
    const buckets = new Map<Aisle, T[]>();
    for (const item of items) {
        const aisle = aisleFor(item.category ?? null);
        buckets.set(aisle, [...(buckets.get(aisle) ?? []), item]);
    }
    return AISLES.filter((a) => buckets.has(a)).map((aisle) => ({ aisle, items: buckets.get(aisle)! }));
}
