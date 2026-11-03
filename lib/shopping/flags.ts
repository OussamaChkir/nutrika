// F3: the flags shown on a scan result. Pure.
//
// Safety rule: "approved" must never read like a green light when today's verdict for the
// active profile is red or unverifiable. In that case the flag says to check the verdict.

import type { VerdictStatus } from "../profiles/evaluate";
import type { ComparedNutrient, UsualComparison } from "./usual";
import type { SavedState } from "./rules";

export type ScanFlagKind = "avoid" | "approved" | "approvedButCheck" | "moreSugar" | "moreSalt" | "moreSaturatedFat";
export type ScanFlagSeverity = "warning" | "caution" | "positive";

export interface ScanFlag {
    kind: ScanFlagKind;
    severity: ScanFlagSeverity;
    params?: { current: number; usual: number };
}

const NUTRIENT_FLAG: Record<ComparedNutrient, ScanFlagKind> = {
    sugars: "moreSugar",
    salt: "moreSalt",
    saturatedFat: "moreSaturatedFat",
};

export interface FlagInput {
    state: SavedState | null;
    comparisons: readonly UsualComparison[];
    /** Verdict of the active profile for this product, when there is one. */
    verdictStatus?: VerdictStatus | null;
}

/** Most important first: avoid, then approved, then the comparisons (sugar, salt, saturated fat). */
export function buildScanFlags({ state, comparisons, verdictStatus }: FlagInput): ScanFlag[] {
    const flags: ScanFlag[] = [];
    if (state === "avoid") flags.push({ kind: "avoid", severity: "warning" });
    if (state === "approved") {
        const unsafe = verdictStatus === "not_suitable" || verdictStatus === "cannot_verify";
        flags.push(unsafe ? { kind: "approvedButCheck", severity: "warning" } : { kind: "approved", severity: "positive" });
    }
    // An approved product is the user's usual choice: comparing it with itself or its peers is noise.
    if (state !== "approved") {
        for (const c of comparisons) {
            flags.push({ kind: NUTRIENT_FLAG[c.nutrient], severity: "caution", params: { current: c.current, usual: c.usual } });
        }
    }
    return flags;
}
