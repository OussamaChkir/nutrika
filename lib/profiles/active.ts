// Which profile is "active" when a product is scored (F4).
//
// Order: the profile named by the cookie, then the account's default profile, then the oldest
// profile. The cookie is only a hint: it is matched against the signed-in user's OWN profiles,
// so a stale or forged id never selects someone else's profile. Pure module: no I/O.

/** The fields needed to choose. `createdAt` breaks ties; a missing one sorts last. */
export interface SelectableProfile {
    id: string;
    isDefault: boolean;
    createdAt?: Date | string | number;
}

const time = (value: SelectableProfile["createdAt"]): number =>
    value === undefined ? Number.POSITIVE_INFINITY : new Date(value).getTime();

export function pickActiveProfile<T extends SelectableProfile>(
    profiles: readonly T[],
    cookieId?: string | null
): T | null {
    if (profiles.length === 0) return null;
    const fromCookie = cookieId ? profiles.find((p) => p.id === cookieId) : undefined;
    if (fromCookie) return fromCookie;
    const fallback = profiles.find((p) => p.isDefault);
    if (fallback) return fallback;
    return [...profiles].sort((a, b) => time(a.createdAt) - time(b.createdAt))[0];
}
