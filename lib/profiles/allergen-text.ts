// Second pass for allergens: read the ingredients TEXT (English, French, Arabic).
//
// Open Food Facts allergen tags are often missing or late, so a product can list "lait" in its
// ingredients with no `en:milk` tag. This module finds those mentions so the safety checks do
// not rely on tags alone. It only ever ADDS warnings; it never removes one that tags raised.
//
// Rules of thumb:
//  - Text after "may contain" / "peut contenir" / "traces de" is a TRACE mention, the rest is
//    a CONTAINS mention.
//  - "sans lait", "gluten-free", "without egg", "خالي من الحليب" are NOT mentions.
//  - Plant "milks" and "butters" (soy milk, cocoa butter, ...) are handled explicitly.
//  - When in doubt it warns: a false warning is acceptable here, a missed allergen is not.
//
// The Arabic lists in particular deserve a review by a native speaker (Tunisian usage).
// Pure module: no I/O.

import type { AllergyOption } from "../allergens";

/** Allergen families the text matcher knows. Several allergy labels can share one. */
export type AllergenGroup =
    | "gluten"
    | "milk"
    | "eggs"
    | "peanuts"
    | "treeNuts"
    | "soy"
    | "fish"
    | "crustaceans"
    | "molluscs"
    | "sesame"
    | "mustard"
    | "celery"
    | "sulphites"
    | "lupin";

/** Which text groups a user's allergy label covers. */
export const ALLERGY_TEXT_GROUPS: Record<AllergyOption, readonly AllergenGroup[]> = {
    Gluten: ["gluten"],
    Lactose: ["milk"],
    Milk: ["milk"],
    Eggs: ["eggs"],
    Peanuts: ["peanuts"],
    "Tree Nuts": ["treeNuts"],
    Soy: ["soy"],
    Fish: ["fish"],
    // People who list "shellfish" usually mean crustaceans and molluscs.
    Shellfish: ["crustaceans", "molluscs"],
    Molluscs: ["molluscs"],
    Sesame: ["sesame"],
    Mustard: ["mustard"],
    Celery: ["celery"],
    Sulphites: ["sulphites"],
    Lupin: ["lupin"],
};

const KEYWORDS: Record<AllergenGroup, readonly string[]> = {
    gluten: [
        "gluten", "wheat", "barley", "rye", "oats", "oat", "spelt", "kamut", "semolina", "durum",
        "blé", "ble", "froment", "orge", "seigle", "avoine", "épeautre", "epeautre", "semoule",
        "قمح", "شعير", "جاودار", "شوفان", "غلوتين", "سميد", "سميدة",
    ],
    milk: [
        "milk", "cream", "butter", "cheese", "whey", "casein", "caseinate", "lactose", "yogurt",
        "yoghurt", "buttermilk",
        "lait", "crème", "creme", "beurre", "fromage", "lactosérum", "lactoserum", "petit-lait",
        "caséine", "caseine", "caséinate", "yaourt", "yogourt",
        "حليب", "لبن", "زبدة", "جبن", "جبنة", "قشدة", "كازين", "مصل اللبن", "لاكتوز",
    ],
    eggs: [
        "egg", "eggs", "albumin", "albumen", "mayonnaise", "meringue",
        "œuf", "œufs", "oeuf", "oeufs", "ovalbumine", "mayonnaise",
        "بيض", "بيضة", "مايونيز",
    ],
    peanuts: [
        "peanut", "peanuts", "groundnut", "groundnuts", "arachide", "arachides", "cacahuète",
        "cacahuètes", "cacahuete", "cacahuetes",
        "فول سوداني", "كاكاوية",
    ],
    treeNuts: [
        "almond", "almonds", "hazelnut", "hazelnuts", "walnut", "walnuts", "cashew", "cashews",
        "pecan", "pecans", "pistachio", "pistachios", "macadamia", "brazil nut", "brazil nuts",
        "tree nuts", "tree nut", "nuts",
        "amande", "amandes", "noisette", "noisettes", "noix", "cajou", "noix de cajou", "pécan",
        "pécans", "pistache", "pistaches", "macadamia",
        "لوز", "بندق", "جوز", "كاجو", "فستق حلبي", "مكسرات",
    ],
    soy: [
        "soy", "soya", "soybean", "soybeans", "edamame",
        "soja", "fèves de soja",
        "صويا", "فول الصويا", "الصويا",
    ],
    fish: [
        "fish", "anchovy", "anchovies", "tuna", "salmon", "cod", "sardine", "sardines", "mackerel",
        "poisson", "poissons", "anchois", "thon", "saumon", "morue", "maquereau",
        "سمك", "سمكة", "تونة", "سردين", "أنشوجة",
    ],
    crustaceans: [
        "crustacean", "crustaceans", "shrimp", "shrimps", "prawn", "prawns", "crab", "lobster",
        "crayfish",
        "crustacé", "crustacés", "crevette", "crevettes", "crabe", "homard", "langoustine",
        "écrevisse", "ecrevisse",
        "قشريات", "جمبري", "قمبري", "سلطعون", "كابوريا", "كركند",
    ],
    molluscs: [
        "mollusc", "molluscs", "mollusk", "mollusks", "squid", "octopus", "mussel", "mussels",
        "oyster", "oysters", "clam", "clams", "cuttlefish", "snail", "snails",
        "mollusque", "mollusques", "calmar", "calamar", "poulpe", "moule", "moules", "huître",
        "huîtres", "palourde", "palourdes", "seiche", "escargot", "escargots",
        "رخويات", "حبار", "أخطبوط", "بلح البحر", "محار",
    ],
    sesame: [
        "sesame", "tahini", "tahina",
        "sésame", "sesame", "tahin",
        "سمسم", "طحينة", "طحين السمسم",
    ],
    mustard: ["mustard", "moutarde", "خردل"],
    celery: ["celery", "celeriac", "céleri", "celeri", "كرفس"],
    sulphites: [
        "sulphite", "sulphites", "sulfite", "sulfites", "sulphur dioxide", "sulfur dioxide",
        "dioxyde de soufre", "anhydride sulfureux",
        "كبريتيت", "ثاني أكسيد الكبريت",
    ],
    lupin: ["lupin", "lupine", "lupins", "ترمس"],
};

/**
 * Phrases that contain an allergen word but are not (or not only) that allergen.
 * Each is rewritten before matching: to the allergen it really contains, or to nothing.
 */
const REWRITES: readonly [RegExp, string][] = [
    // Nut and soy "milks" contain the nut / soy, not milk.
    [/\b(almond|hazelnut|cashew|pistachio)\s+milk\b/giu, "$1"],
    [/\b(soy|soya)\s+milk\b/giu, "soy"],
    [/\b(oat|rice|coconut)\s+milk\b/giu, " "],
    [/\blait\s+(?:d'|de\s+|d’)\s*(amande|noisette|cajou|pistache)s?\b/giu, "$1"],
    [/\blait\s+(?:de\s+)?soja\b/giu, "soja"],
    [/\blait\s+(?:d'|de\s+|d’)\s*(avoine|riz|coco)\b/giu, " "],
    // Plant butters are not dairy.
    [/\b(cocoa|cacao|shea|karit[eé])\s+butter\b/giu, " "],
    [/\bbeurre\s+(?:de\s+|d'|d’)\s*(cacao|karit[eé])\b/giu, " "],
    [/\b(peanut)\s+butter\b/giu, "$1"],
    [/\bbeurre\s+(?:de\s+)?(cacahu[eè]tes?|arachides?)\b/giu, "$1"],
    [/\b(almond|nut)\s+butter\b/giu, "$1"],
    // Coconut and nutmeg are not tree-nut allergens.
    [/\bnoix\s+de\s+(coco|muscade)\b/giu, " "],
    [/\b(coconut|nutmeg)\b/giu, " "],
    // Buckwheat is not wheat.
    [/\b(buckwheat|sarrasin|bl[eé]\s+noir)\b/giu, " "],
    [/(?<![\p{L}\p{N}])حنطة\s+سوداء(?![\p{L}\p{N}])/gu, " "],
];

// Text before a keyword that negates it ("sans lait", "gluten-free" is handled after).
const NEGATION_BEFORE =
    /(?:\bsans|\bwithout|\bfree\s+(?:of|from)|\bno|\bnon|\bne\s+contient\s+pas(?:\s+de|\s+d')?|\bexempt\s+de|\bsans\s+traces?\s+(?:de|d')|خالي\s+من|خالٍ\s+من|بدون|لا\s+يحتوي\s+على)\s*$/iu;
const NEGATION_AFTER = /^\s*-?\s*(?:free|libre)\b/iu;

// Start of a "may contain" statement. Everything up to the end of the sentence is traces.
const TRACE_MARKER =
    /(?:may\s+contain|might\s+contain|could\s+contain|made\s+in\s+a\s+facility|produced\s+in\s+a\s+(?:factory|facility)|traces?\s+(?:of|de|d'|éventuelles?)|peut\s+contenir|peuvent\s+contenir|pourrait\s+contenir|contient\s+des\s+traces|fabriqu\w+\s+dans\s+un\s+atelier|قد\s+يحتوي|قد\s+تحتوي|يحتوي\s+على\s+آثار|آثار\s+من)/giu;

const ARABIC = /[؀-ۿ]/u;
// Arabic glues articles and prepositions to the word: "والحليب" = "and the milk".
const ARABIC_PREFIX = "(?:و|ف)?(?:بال|لل|ال|ب|ل)?";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildMatcher(words: readonly string[]): RegExp {
    const alternatives = [...words]
        .sort((a, b) => b.length - a.length)
        .map((w) => {
            const body = escapeRegExp(w).replace(/\s+/g, "\\s+");
            return ARABIC.test(w) ? `${ARABIC_PREFIX}${body}` : body;
        })
        .join("|");
    return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, "giu");
}

const MATCHERS = Object.fromEntries(
    (Object.keys(KEYWORDS) as AllergenGroup[]).map((group) => [group, buildMatcher(KEYWORDS[group])])
) as Record<AllergenGroup, RegExp>;

const SULPHITE_E_NUMBER = /(?<![\p{L}\p{N}])E\s?22[0-8](?![\p{L}\p{N}])/giu;

function normalize(text: string): string {
    let out = text.normalize("NFC").replace(/[’]/g, "'");
    for (const [pattern, replacement] of REWRITES) out = out.replace(pattern, replacement);
    return out;
}

/** Split into the part that states what the product contains and the "may contain" part. */
function splitTraces(text: string): { contains: string; traces: string } {
    const contains: string[] = [];
    const traces: string[] = [];
    let cursor = 0;
    TRACE_MARKER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TRACE_MARKER.exec(text)) !== null) {
        contains.push(text.slice(cursor, match.index));
        const rest = text.slice(match.index);
        // A trace statement ends at the next full stop or semicolon (or the end of the text).
        const end = rest.search(/[.;؛\n]/u);
        const stop = end === -1 ? text.length : match.index + end;
        traces.push(text.slice(match.index, stop));
        cursor = stop;
        TRACE_MARKER.lastIndex = Math.max(stop, match.index + match[0].length);
    }
    contains.push(text.slice(cursor));
    return { contains: contains.join(" "), traces: traces.join(" ") };
}

function findGroups(text: string): Set<AllergenGroup> {
    const found = new Set<AllergenGroup>();
    for (const group of Object.keys(MATCHERS) as AllergenGroup[]) {
        const matcher = MATCHERS[group];
        matcher.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = matcher.exec(text)) !== null) {
            const before = text.slice(Math.max(0, m.index - 24), m.index);
            const after = text.slice(m.index + m[0].length, m.index + m[0].length + 12);
            if (NEGATION_BEFORE.test(before) || NEGATION_AFTER.test(after)) continue;
            found.add(group);
            break;
        }
    }
    if (!found.has("sulphites") && SULPHITE_E_NUMBER.test(text)) found.add("sulphites");
    SULPHITE_E_NUMBER.lastIndex = 0;
    return found;
}

export interface TextAllergens {
    /** Allergen families the ingredients list states as ingredients. */
    contains: ReadonlySet<AllergenGroup>;
    /** Allergen families only mentioned as traces / "may contain". */
    traces: ReadonlySet<AllergenGroup>;
}

/** Find allergen mentions in an ingredients text. Empty sets for empty or missing text. */
export function detectAllergensInText(text: string | undefined | null): TextAllergens {
    if (!text || !text.trim()) return { contains: new Set(), traces: new Set() };
    const { contains, traces } = splitTraces(normalize(text));
    const containsGroups = findGroups(contains);
    const traceGroups = findGroups(traces);
    // A family that is both an ingredient and a trace is simply an ingredient.
    for (const g of containsGroups) traceGroups.delete(g);
    return { contains: containsGroups, traces: traceGroups };
}

/** Does the text result touch one of the user's allergy labels? */
export function textMatchesAllergy(
    allergy: AllergyOption,
    found: ReadonlySet<AllergenGroup>
): boolean {
    return ALLERGY_TEXT_GROUPS[allergy].some((group) => found.has(group));
}
