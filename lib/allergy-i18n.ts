import { ALLERGENS, ALLERGY_OPTIONS, type AllergyOption } from "@/lib/allergens";

/** Allergy label -> key under the `Profile` i18n namespace. Derived from the canonical list. */
export const ALLERGY_I18N_KEYS = Object.fromEntries(
    ALLERGY_OPTIONS.map((allergy) => [allergy, ALLERGENS[allergy].i18nKey])
) as Record<AllergyOption, string>;
