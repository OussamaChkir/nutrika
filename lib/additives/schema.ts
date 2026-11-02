// F6 knowledge base: one reviewed explanation per additive.
//
// A curated knowledge base, NOT live LLM answers: live answers vary and can invent claims.
// The LLM may draft an entry, but nothing is shown to users until a human has checked it
// against the sources and set review.status to "reviewed" (see lib/additives/lookup.ts).
//
// Pure module (Zod only): safe on server, client and offline.

import { z } from "zod";

import { AGE_BANDS, CONDITIONS, DIETS, GOALS } from "../profiles/constants";

export const ADDITIVE_LOCALES = ["en", "fr"] as const;
export type AdditiveLocale = (typeof ADDITIVE_LOCALES)[number];

export const ADDITIVE_CATEGORIES = [
    "colour",
    "preservative",
    "sweetener",
    "flavour_enhancer",
    "emulsifier",
    "thickener",
    "acidity_regulator",
    "antioxidant",
    "other",
] as const;

/**
 * How strong the evidence is that this additive affects health at normal intake:
 *  - strong: consistent evidence of an effect
 *  - limited: some studies, mixed results
 *  - uncertain: little or conflicting data
 *  - none_known: regulators found no concern at current uses
 */
export const ADDITIVE_EVIDENCE = ["strong", "limited", "uncertain", "none_known"] as const;
export type AdditiveEvidence = (typeof ADDITIVE_EVIDENCE)[number];

/** Profile keys a "For you" note can target. "child" is the child age band. */
export const FOR_YOU_KEYS = ["child", ...CONDITIONS, ...DIETS, ...GOALS] as const;
export type ForYouKey = (typeof FOR_YOU_KEYS)[number];

// Keep the age band list in sync: "child" must be a real band.
void AGE_BANDS;

const text = z.string().trim().min(8).max(600);
const localized = z.object({ en: text, fr: text }).strict();
const shortName = z.object({ en: z.string().trim().min(2).max(80), fr: z.string().trim().min(2).max(80) }).strict();

export const additiveInfoSchema = z
    .object({
        /** "E102", "E150d": upper-case E, digits, optional lower-case letter(s). */
        code: z.string().regex(/^E\d{3,4}[a-z]{0,2}$/, "code like E102 or E150d"),
        names: shortName,
        category: z.enum(ADDITIVE_CATEGORIES),
        whatItIs: localized,
        whyUsed: localized,
        /** What is known and what is not, in calm words (no fear words). */
        knownAndUnknown: localized,
        evidence: z.enum(ADDITIVE_EVIDENCE),
        forYou: z
            .array(z.object({ for: z.enum(FOR_YOU_KEYS), note: localized }).strict())
            .max(6)
            .default([]),
        sources: z
            .array(
                z
                    .object({
                        label: z.string().trim().min(4).max(160),
                        url: z.string().url().startsWith("https://"),
                    })
                    .strict()
            )
            .min(1)
            .max(6),
        review: z
            .object({
                status: z.enum(["draft", "reviewed"]),
                /** ISO date (YYYY-MM-DD) of the human review. Required once reviewed. */
                reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
                reviewer: z.string().trim().min(2).max(80).nullable(),
                /** Free note for the reviewer: what was not verified yet. */
                notes: z.string().max(600).optional(),
            })
            .strict()
            .superRefine((review, ctx) => {
                if (review.status === "reviewed" && (!review.reviewedAt || !review.reviewer)) {
                    ctx.addIssue({ code: "custom", message: "reviewed needs reviewedAt and reviewer" });
                }
            }),
    })
    .strict();

export type AdditiveInfo = z.infer<typeof additiveInfoSchema>;
