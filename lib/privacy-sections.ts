// Structure of the Privacy page: section ids and how many bullet points each one has.
// Texts live in messages/*.json under "Privacy" as `<id>Title`, `<id>Content` and `<id>List<n>`.
// lib/privacy-sections.test.ts checks that EN and FR have every key, so a section
// cannot ship half translated.

export interface PrivacySection {
    id: string;
    /** Number of bullet points (`<id>List1` ... `<id>ListN`). */
    list?: number;
}

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
    { id: "intro" },
    { id: "collect", list: 6 },
    { id: "health", list: 4 },
    { id: "use", list: 4 },
    { id: "share", list: 5 },
    { id: "cookies", list: 4 },
    { id: "retention", list: 3 },
    { id: "security" },
    { id: "rights" },
    { id: "children" },
    { id: "contact" },
];

/** Every message key the page needs, for tests. */
export function privacyKeys(): string[] {
    return PRIVACY_SECTIONS.flatMap(({ id, list = 0 }) => [
        `${id}Title`,
        `${id}Content`,
        ...Array.from({ length: list }, (_, i) => `${id}List${i + 1}`),
    ]);
}
