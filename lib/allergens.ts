// Canonical allergen list: the ONE place that defines which allergens Nutrika knows.
//
// Scope: the 14 allergens that EU rules require manufacturers to declare
// (Regulation (EU) No 1169/2011, Annex II), plus lactose (intolerance, not an
// allergy, but one of the most requested filters).
//
// Everything that needs allergens (profile form, validation, scoring severity,
// "may contain" safety mode, offline rules) must import from here instead of
// keeping its own list. Pure module: no I/O, safe on server, client and offline.

export type AllergenSeverity = "LOW" | "MEDIUM" | "HIGH";

/**
 * Stable labels. These strings are what users already have stored in
 * `User.allergies`, so existing labels must never be renamed.
 * "Shellfish" is the legacy label for crustaceans.
 */
export const ALLERGY_OPTIONS = [
    "Gluten",
    "Lactose",
    "Milk",
    "Eggs",
    "Peanuts",
    "Tree Nuts",
    "Soy",
    "Fish",
    "Shellfish",
    "Molluscs",
    "Sesame",
    "Mustard",
    "Celery",
    "Sulphites",
    "Lupin",
] as const;

export type AllergyOption = (typeof ALLERGY_OPTIONS)[number];

export interface AllergenDefinition {
    /** Key under the `Profile` i18n namespace. */
    i18nKey: string;
    /** True for the 14 allergens of the EU declaration list. */
    euListed: boolean;
    /**
     * Lower-case allergen names (Open Food Facts tag, without "en:" and with "-"
     * turned into spaces) that mean "this product contains this allergen".
     * Matching is conservative: when in doubt, a warning is shown.
     */
    productNames: readonly string[];
    /** Coarse severity used by the allergen badge on the product page. */
    severity: AllergenSeverity;
}

export const ALLERGENS: Record<AllergyOption, AllergenDefinition> = {
    Gluten: { i18nKey: "allergyGluten", euListed: true, productNames: ["gluten"], severity: "LOW" },
    // Open Food Facts has no lactose tag: any milk declaration is treated as lactose-relevant.
    Lactose: { i18nKey: "allergyLactose", euListed: false, productNames: ["milk"], severity: "MEDIUM" },
    Milk: { i18nKey: "allergyMilk", euListed: true, productNames: ["milk"], severity: "MEDIUM" },
    Eggs: { i18nKey: "allergyEggs", euListed: true, productNames: ["eggs"], severity: "MEDIUM" },
    Peanuts: { i18nKey: "allergyPeanuts", euListed: true, productNames: ["peanuts"], severity: "HIGH" },
    "Tree Nuts": { i18nKey: "allergyTreeNuts", euListed: true, productNames: ["nuts", "tree nuts"], severity: "HIGH" },
    Soy: { i18nKey: "allergySoy", euListed: true, productNames: ["soybeans", "soy"], severity: "MEDIUM" },
    Fish: { i18nKey: "allergyFish", euListed: true, productNames: ["fish"], severity: "HIGH" },
    // "Shellfish" also matches molluscs: people who list shellfish usually mean both.
    Shellfish: { i18nKey: "allergyShellfish", euListed: true, productNames: ["crustaceans", "molluscs", "shellfish"], severity: "HIGH" },
    Molluscs: { i18nKey: "allergyMolluscs", euListed: true, productNames: ["molluscs"], severity: "HIGH" },
    Sesame: { i18nKey: "allergySesame", euListed: true, productNames: ["sesame seeds", "sesame"], severity: "MEDIUM" },
    Mustard: { i18nKey: "allergyMustard", euListed: true, productNames: ["mustard"], severity: "LOW" },
    Celery: { i18nKey: "allergyCelery", euListed: true, productNames: ["celery"], severity: "LOW" },
    Sulphites: { i18nKey: "allergySulphites", euListed: true, productNames: ["sulphur dioxide and sulphites", "sulphites"], severity: "LOW" },
    Lupin: { i18nKey: "allergyLupin", euListed: true, productNames: ["lupin"], severity: "LOW" },
};

const TRACE_PREFIX = "may contain ";

const SEVERITY_RANK: Record<AllergenSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function isKnownAllergy(value: string): value is AllergyOption {
    return (ALLERGY_OPTIONS as readonly string[]).includes(value);
}

/**
 * Whole-word match, so "nuts" matches "tree nuts" but not "peanuts",
 * and "fish" does not match "shellfish".
 */
function containsName(base: string, name: string): boolean {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(base);
}

/** Split a product allergen name into its base name and whether it is a "may contain" trace. */
function splitTrace(name: string): { base: string; trace: boolean } {
    const lower = name.trim().toLowerCase();
    return lower.startsWith(TRACE_PREFIX)
        ? { base: lower.slice(TRACE_PREFIX.length), trace: true }
        : { base: lower, trace: false };
}

/**
 * Severity of a product allergen name ("peanuts", "may contain sesame", ...).
 * Names that match nothing in the list are LOW.
 */
export function getAllergenSeverity(name: string): AllergenSeverity {
    const { base } = splitTrace(name);
    let result: AllergenSeverity = "LOW";
    for (const allergy of ALLERGY_OPTIONS) {
        const { productNames, severity } = ALLERGENS[allergy];
        if (productNames.some((n) => containsName(base, n)) && SEVERITY_RANK[severity] > SEVERITY_RANK[result]) {
            result = severity;
        }
    }
    return result;
}

export interface AllergenMatch {
    /** The user's allergy that matched. */
    allergy: AllergyOption;
    /** The product allergen name that triggered it, as given. */
    productAllergen: string;
    /** True when the product only "may contain" it (cross-contamination). */
    trace: boolean;
}

/**
 * Which of the user's allergies appear in a product's allergen list.
 * Unknown labels in `userAllergies` are ignored. Results are ordered by the
 * user's allergy list, then by the product's allergen order.
 */
export function findAllergenMatches(
    userAllergies: readonly string[],
    productAllergens: readonly string[]
): AllergenMatch[] {
    const matches: AllergenMatch[] = [];
    for (const allergy of userAllergies) {
        if (!isKnownAllergy(allergy)) continue;
        const { productNames } = ALLERGENS[allergy];
        for (const productAllergen of productAllergens) {
            const { base, trace } = splitTrace(productAllergen);
            if (productNames.some((n) => containsName(base, n))) {
                matches.push({ allergy, productAllergen, trace });
            }
        }
    }
    return matches;
}
