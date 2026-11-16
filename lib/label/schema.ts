// F5: what the vision model returns, and what the user edits. Pure, no I/O.
//
// Two shapes on purpose:
//  - RawExtraction: the model's answer, parsed leniently (it may give "12,5" or "١٢" for a number)
//    but validated strictly. Anything that does not fit becomes null / empty, never a guess.
//  - LabelForm: what the review screen edits and the server re-validates before scoring.
//    The user is the final check; the model is only a typist.

import { z } from "zod";

export const KINDS = ["food", "drink", "cheese", "oil_fat"] as const;
export type LabelKind = (typeof KINDS)[number];

export const LANGUAGES = ["fr", "ar", "en", "mixed", "other"] as const;
export type LabelLanguage = (typeof LANGUAGES)[number];

export const READABLE = ["good", "partial", "unreadable"] as const;
export type Readable = (typeof READABLE)[number];

export const BASES = ["per100g", "per100ml", "perServing", "unknown"] as const;
export type NutritionBasis = (typeof BASES)[number];

export const NUTRIENT_FIELDS = ["energyKcal", "fat", "saturatedFat", "carbohydrates", "sugars", "fiber", "proteins", "salt"] as const;
export type NutrientField = (typeof NUTRIENT_FIELDS)[number];

export const MAX_INGREDIENTS_LENGTH = 4000;
export const MAX_ALLERGEN_ITEMS = 20;
export const MAX_ITEM_LENGTH = 60;
export const MAX_NAME_LENGTH = 120;

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** "12,5", "12.5 g", "١٢" and plain numbers become numbers; everything else becomes null. */
export function parseNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    const cleaned = value
        .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
        .replace(/\u066C/g, "") // Arabic thousands separator
        .replace(/[,\u066B\u060C]/, ".") // comma, Arabic decimal separator, Arabic comma
        .replace(/[^0-9.\-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

const num = z.preprocess((v) => parseNumber(v), z.number().nullable());

const text = (max: number) =>
    z.preprocess(
        (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) || null : null),
        z.string().nullable()
    );

const list = z.preprocess(
    (v) =>
        Array.isArray(v)
            ? v
                  .filter((x): x is string => typeof x === "string")
                  .map((x) => x.replace(/\s+/g, " ").trim().slice(0, MAX_ITEM_LENGTH))
                  .filter(Boolean)
                  .slice(0, MAX_ALLERGEN_ITEMS)
            : [],
    z.array(z.string())
);

const confidence = z.preprocess((v) => {
    const n = parseNumber(v);
    return n === null ? 0 : Math.min(1, Math.max(0, n));
}, z.number());

export const rawExtractionSchema = z.object({
    productName: text(MAX_NAME_LENGTH),
    brand: text(MAX_NAME_LENGTH),
    kind: z.enum(KINDS).catch("food"),
    language: z.enum(LANGUAGES).nullable().catch(null),
    readable: z.enum(READABLE).catch("partial"),
    confidence,
    ingredientsText: text(MAX_INGREDIENTS_LENGTH),
    /** The model's belief that the whole ingredient list is visible and was read. */
    ingredientsComplete: z.boolean().catch(false),
    allergensContains: list,
    allergensMayContain: list,
    nutrition: z
        .object({
            basis: z.enum(BASES).catch("unknown"),
            servingSizeG: num,
            energyKcal: num,
            fat: num,
            saturatedFat: num,
            carbohydrates: num,
            sugars: num,
            fiber: num,
            proteins: num,
            salt: num,
            /** Grams of sodium. Converted to salt (x 2.5) when salt itself is not printed. */
            sodium: num,
        })
        .catch({
            basis: "unknown", servingSizeG: null, energyKcal: null, fat: null, saturatedFat: null,
            carbohydrates: null, sugars: null, fiber: null, proteins: null, salt: null, sodium: null,
        }),
});
export type RawExtraction = z.infer<typeof rawExtractionSchema>;

// ---------- the form the user edits ----------

const nutrient = (max: number) => z.number().min(0).max(max).nullable();

/** Strict: this is what the server checks again before scoring anything. */
export const labelFormSchema = z.object({
    productName: z.string().trim().max(MAX_NAME_LENGTH),
    brand: z.string().trim().max(MAX_NAME_LENGTH),
    kind: z.enum(KINDS),
    ingredientsText: z.string().trim().max(MAX_INGREDIENTS_LENGTH),
    /** The user says the ingredient list above is the whole list. Without it, allergens cannot be verified. */
    ingredientsComplete: z.boolean(),
    allergensContains: z.array(z.string().trim().min(1).max(MAX_ITEM_LENGTH)).max(MAX_ALLERGEN_ITEMS),
    allergensMayContain: z.array(z.string().trim().min(1).max(MAX_ITEM_LENGTH)).max(MAX_ALLERGEN_ITEMS),
    nutrition: z.object({
        energyKcal: nutrient(900),
        fat: nutrient(100),
        saturatedFat: nutrient(100),
        carbohydrates: nutrient(100),
        sugars: nutrient(100),
        fiber: nutrient(100),
        proteins: nutrient(100),
        salt: nutrient(100),
    }),
});
export type LabelForm = z.infer<typeof labelFormSchema>;

export type LabelWarningCode =
    | "unreadable"
    | "partial"
    | "lowConfidence"
    | "noIngredients"
    | "perServingConverted"
    | "perServingNoSize"
    | "saltFromSodium"
    | "valueRemoved"
    | "basisUnknown";

export interface LabelWarning {
    code: LabelWarningCode;
    /** For valueRemoved: which nutrient. */
    field?: NutrientField;
}

export interface Extraction {
    form: LabelForm;
    warnings: LabelWarning[];
    confidence: number;
    readable: Readable;
    language: LabelLanguage | null;
}
