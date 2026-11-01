// Stored profile -> PersonalProfile, defensively.
//
// Database values are plain strings. They were validated on the way in (profileInputSchema),
// but the rules must still never see an unknown value, so anything not in the allowed lists is
// dropped here. Pure module: no I/O.

import { ALLERGY_OPTIONS, type AllergyOption } from "../allergens";
import {
    AGE_BANDS,
    ALLERGEN_STRICTNESS,
    CONDITIONS,
    DEFAULT_STRICTNESS,
    DIETS,
    GOALS,
    type AgeBand,
    type PersonalProfile,
} from "./constants";

/** The fields of a stored `Profile` row that the rules and the editor need. */
export interface StoredProfile {
    id: string;
    name: string;
    ageBand: string;
    isDefault: boolean;
    conditions: string[];
    diets: string[];
    goals: string[];
    allergens: string[];
    allergenStrictness: string;
}

function keepAllowed<T extends string>(values: readonly string[], allowed: readonly T[]): T[] {
    return allowed.filter((a) => values.includes(a));
}

export function toPersonalProfile(row: StoredProfile): PersonalProfile {
    return {
        conditions: keepAllowed(row.conditions, CONDITIONS),
        diets: keepAllowed(row.diets, DIETS),
        goals: keepAllowed(row.goals, GOALS),
        allergens: keepAllowed<AllergyOption>(row.allergens, ALLERGY_OPTIONS),
        // An unknown strictness falls back to the safer one.
        allergenStrictness:
            (ALLERGEN_STRICTNESS as readonly string[]).includes(row.allergenStrictness)
                ? (row.allergenStrictness as PersonalProfile["allergenStrictness"])
                : DEFAULT_STRICTNESS,
    };
}

/** A profile as sent to the browser: no user id, no consent date, no timestamps. */
export interface ProfileDto {
    id: string;
    name: string;
    ageBand: AgeBand;
    isDefault: boolean;
    conditions: PersonalProfile["conditions"];
    diets: PersonalProfile["diets"];
    goals: PersonalProfile["goals"];
    allergens: PersonalProfile["allergens"];
    allergenStrictness: PersonalProfile["allergenStrictness"];
}

export function toProfileDto(row: StoredProfile): ProfileDto {
    return {
        id: row.id,
        name: row.name,
        ageBand: (AGE_BANDS as readonly string[]).includes(row.ageBand) ? (row.ageBand as AgeBand) : "adult",
        isDefault: row.isDefault,
        ...toPersonalProfile(row),
    };
}
