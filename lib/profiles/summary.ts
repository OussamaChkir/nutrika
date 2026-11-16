// One-line summary of a verdict, for compact views such as the "check for everyone" table.
// Pure module: no I/O.

import type { PersonalReason, PersonalVerdict, ReasonLevel } from "./evaluate";

const SEVERITY: ReasonLevel[] = ["block", "caution", "unknown", "good"];

/**
 * The reason that best explains the verdict: the most severe level, and within it the first one
 * (allergen reasons come first in the engine's output). `null` when there is nothing to say.
 */
export function mostSevereReason(verdict: Pick<PersonalVerdict, "reasons">): PersonalReason | null {
    for (const level of SEVERITY) {
        const found = verdict.reasons.find((r) => r.level === level);
        if (found) return found;
    }
    return null;
}
