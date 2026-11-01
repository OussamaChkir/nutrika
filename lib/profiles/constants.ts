// Personal profile: allowed values and validation.
//
// Single source of truth for what a profile can contain. Only options that have an
// evaluation rule in ./evaluate are listed here, so the editor never offers a choice that
// silently does nothing. Planned but NOT yet implemented (they need a dietitian review or
// cannot be decided from a label): halal, kosher, pregnancy, kidney_disease.
//
// Allergens reuse the canonical list from ../allergens (same labels as User.allergies).
// Pure module: no I/O.

import { z } from "zod";

import { ALLERGY_OPTIONS } from "../allergens";

export const CONDITIONS = ["diabetes", "hypertension"] as const;
export const DIETS = ["vegan", "vegetarian", "keto", "low_sodium"] as const;
export const GOALS = ["weight_loss", "muscle_gain"] as const;
export const AGE_BANDS = ["child", "teen", "adult"] as const;

/**
 * How to treat "may contain" traces (F7).
 *  - avoid_traces: contains AND may contain are both "not suitable"
 *  - intentional_only: contains is "not suitable", may contain is "caution"
 */
export const ALLERGEN_STRICTNESS = ["avoid_traces", "intentional_only"] as const;

export type Condition = (typeof CONDITIONS)[number];
export type Diet = (typeof DIETS)[number];
export type Goal = (typeof GOALS)[number];
export type AgeBand = (typeof AGE_BANDS)[number];
export type AllergenStrictness = (typeof ALLERGEN_STRICTNESS)[number];

/** Safer default: a trace warning is cheap, a missed trace is not. Users can relax it. */
export const DEFAULT_STRICTNESS: AllergenStrictness = "avoid_traces";

/** Profiles per account (family profiles, F4). */
export const MAX_PROFILES_PER_USER = 6;

export const NAME_MAX_LENGTH = 40;

/** What a profile holds, as used by the rules. */
export interface PersonalProfile {
    conditions: readonly Condition[];
    diets: readonly Diet[];
    goals: readonly Goal[];
    allergens: readonly (typeof ALLERGY_OPTIONS)[number][];
    allergenStrictness: AllergenStrictness;
}

const uniqueEnumArray = <T extends readonly [string, ...string[]]>(values: T) =>
    z
        .array(z.enum(values))
        .max(values.length)
        .transform((items) => Array.from(new Set(items)));

/**
 * Input of the create / update actions.
 * A nickname and an age band are used instead of a full name or birth date (F4 privacy rule).
 * `consent` must be literally true: health data is only stored after an explicit tick.
 */
export const profileInputSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`),
    ageBand: z.enum(AGE_BANDS).default("adult"),
    conditions: uniqueEnumArray(CONDITIONS).default([]),
    diets: uniqueEnumArray(DIETS).default([]),
    goals: uniqueEnumArray(GOALS).default([]),
    allergens: uniqueEnumArray(ALLERGY_OPTIONS).default([]),
    allergenStrictness: z.enum(ALLERGEN_STRICTNESS).default(DEFAULT_STRICTNESS),
    isDefault: z.boolean().default(false),
    consent: z.literal(true, { message: "Consent is required to save health information" }),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type ProfileFormValues = z.input<typeof profileInputSchema>;
