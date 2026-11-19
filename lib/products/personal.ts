// "Score for you" (F1) and the allergen findings (F7) for a set of profiles. Pure: no I/O.

import { pickActiveProfile, type SelectableProfile } from "../profiles/active";
import type { PersonalProfile } from "../profiles/constants";
import { evaluateProduct, type PersonalVerdict } from "../profiles/evaluate";
import { toPersonalProfile, type StoredProfile } from "../profiles/profile";
import type { Product } from "../product";

export type ProfileRow = StoredProfile & SelectableProfile;

export interface PersonalView {
    activeProfileId: string;
    /** The verdict for the active profile. */
    verdict: PersonalVerdict;
    /** One verdict per profile, for the "check for everyone" matrix. */
    everyone: Array<{ profileId: string; name: string; isActive: boolean; verdict: PersonalVerdict }>;
}

/**
 * The hint (X-Profile-Id) is only honored when it is one of the user's own profiles; otherwise the
 * default profile, then the oldest, is used. Returns null when the user has no profile.
 */
export function buildPersonalView(
    product: Product,
    universalScore: number,
    rows: readonly ProfileRow[],
    hintProfileId: string | null
): { view: PersonalView; activeProfile: PersonalProfile } | null {
    const active = pickActiveProfile(rows, hintProfileId);
    if (!active) return null;

    const everyone = rows.map((row) => ({
        profileId: row.id,
        name: row.name,
        isActive: row.id === active.id,
        verdict: evaluateProduct(product, toPersonalProfile(row), universalScore),
    }));
    const current = everyone.find((r) => r.isActive)!;
    return {
        view: { activeProfileId: active.id, verdict: current.verdict, everyone },
        activeProfile: toPersonalProfile(active),
    };
}
