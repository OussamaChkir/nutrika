// Look up additive explanations. Pure: the data is passed in, so tests need no files.

import type { PersonalProfile } from "../profiles/constants";
import type { AdditiveEvidence, AdditiveInfo, AdditiveLocale, ForYouKey } from "./schema";

/**
 * "e150d", "en:e150d", "E150D-caramel", " E 102 " -> "E150d".
 * Returns null when the text is not an E number.
 */
export function normalizeAdditiveCode(raw: string): string | null {
    const cleaned = raw.trim().replace(/^[a-z]{2}:/i, "").split("-")[0].replace(/\s+/g, "");
    const match = /^E(\d{3,4})([A-Za-z]{0,2})$/i.exec(cleaned);
    return match ? `E${match[1]}${match[2].toLowerCase()}` : null;
}

/** What the UI needs, in one language. Plain data, safe to send to the browser. */
export interface AdditiveView {
    code: string;
    name: string;
    category: AdditiveInfo["category"];
    whatItIs: string;
    whyUsed: string;
    knownAndUnknown: string;
    evidence: AdditiveEvidence;
    forYou: { for: ForYouKey; note: string }[];
    sources: { label: string; url: string }[];
    /** False for drafts (only visible with includeDrafts): the UI labels them. */
    reviewed: boolean;
}

export interface LookupOptions {
    /** Show entries that no human has reviewed yet. Only for development and Storybook. */
    includeDrafts?: boolean;
}

export type AdditiveIndex = ReadonlyMap<string, AdditiveInfo>;

export function buildIndex(entries: readonly AdditiveInfo[]): AdditiveIndex {
    return new Map(entries.map((e) => [e.code, e]));
}

/** The localized entry, or null when there is none or it is still a draft. */
export function getAdditiveInfo(
    index: AdditiveIndex,
    rawCode: string,
    locale: AdditiveLocale,
    options: LookupOptions = {}
): AdditiveView | null {
    const code = normalizeAdditiveCode(rawCode);
    const entry = code ? index.get(code) : undefined;
    if (!entry) return null;
    if (entry.review.status !== "reviewed" && !options.includeDrafts) return null;
    return {
        code: entry.code,
        name: entry.names[locale],
        category: entry.category,
        whatItIs: entry.whatItIs[locale],
        whyUsed: entry.whyUsed[locale],
        knownAndUnknown: entry.knownAndUnknown[locale],
        evidence: entry.evidence,
        forYou: entry.forYou.map((f) => ({ for: f.for, note: f.note[locale] })),
        sources: entry.sources,
        reviewed: entry.review.status === "reviewed",
    };
}

/** Does the profile have this characteristic? */
function profileHas(profile: PersonalProfile, key: ForYouKey): boolean {
    if (key === "child") return profile.ageBand === "child";
    return (
        (profile.conditions as readonly string[]).includes(key) ||
        (profile.diets as readonly string[]).includes(key) ||
        (profile.goals as readonly string[]).includes(key)
    );
}

/** The "For you" notes of an entry that match the active profile. Empty without a profile. */
export function forYouNotes(view: AdditiveView, profile: PersonalProfile | null): string[] {
    if (!profile) return [];
    return view.forYou.filter((f) => profileHas(profile, f.for)).map((f) => f.note);
}

/** Unique, valid additive codes of a product in their original order. Bad entries are dropped. */
export function productAdditiveCodes(rawCodes: readonly string[]): string[] {
    const seen = new Set<string>();
    for (const raw of rawCodes) {
        const code = normalizeAdditiveCode(raw);
        if (code) seen.add(code);
    }
    return Array.from(seen);
}
