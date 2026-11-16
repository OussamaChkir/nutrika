// F2: pick better alternatives for a scanned product. Pure: no I/O, no network.
//
// The caller fetches candidates (same category, ideally sold in the user's country) and this
// module decides which ones are really better, for this person, and why. Rules in one place so a
// dietitian or the owner can read them:
//
//   - a candidate must be clearly better: at least MIN_SCORE_GAIN points above the scanned product
//   - with a profile, "better" means the personal score, and a candidate that is not suitable for
//     the profile, or that cannot be verified (allergy + missing ingredients), is never suggested
//   - candidates with too little nutrition data are dropped: their score would look good by default
//   - ranking: effective score, then fewer additives, then more protein, then barcode (stable)
//
// PRODUCT DECISIONS (first proposal, change the constants below): the numbers in this file.

import type { Product } from "../product";
import type { PersonalProfile } from "../profiles/constants";
import { evaluateProduct, type VerdictStatus } from "../profiles/evaluate";
import { scoreProduct, type ScoreLetter } from "../scoring";
import { CATEGORY_RULES, getProductCategory } from "../scoring-rules";

/** A suggestion must beat the scanned product by at least this many points. */
export const MIN_SCORE_GAIN = 8;
/** How many suggestions to show. */
export const MAX_ALTERNATIVES = 4;
/** A candidate needs at least this many of the 6 core nutrients, or its score means little. */
export const MIN_KNOWN_NUTRIENTS = 4;

export type AlternativeReasonKey =
    | "lessSugar"
    | "lessSalt"
    | "lessSaturatedFat"
    | "fewerAdditives"
    | "lessProcessed"
    | "moreProtein"
    | "moreFiber"
    | "betterScore";

export interface AlternativeReason {
    /** Message key under the `Alternatives.reasons` i18n namespace. */
    key: AlternativeReasonKey;
    params?: Record<string, string | number>;
}

export interface Alternative {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    /** Universal score, as shown to everyone. */
    score: number;
    letter: ScoreLetter;
    color: string;
    /** Points gained over the scanned product, on the personal score when a profile is used. */
    delta: number;
    deltaIsPersonal: boolean;
    personalScore: number | null;
    status: VerdictStatus | null;
    reason: AlternativeReason;
    countriesTags: string[];
}

export interface RankInput {
    current: Product;
    /** The scanned product's universal score (0-100). */
    currentScore: number;
    candidates: readonly Product[];
    profile: PersonalProfile | null;
    limit?: number;
}

// ---------- when to offer ----------

/** Offer alternatives for a grade C or worse, or when the personal verdict is not good news. */
export function shouldOfferAlternatives(input: { letter: ScoreLetter; status?: VerdictStatus | null }): boolean {
    if (input.letter === "C" || input.letter === "D" || input.letter === "E") return true;
    return input.status === "not_suitable" || input.status === "caution";
}

// ---------- data quality ----------

function knownNutrients(p: Product): number {
    const n = p.nutrients;
    return [n.sugars, n.saturatedFat, n.salt, n.fat, n.carbohydrates, n.proteins].filter(
        (v) => typeof v === "number" && Number.isFinite(v)
    ).length;
}

function hasUsableName(p: Product): boolean {
    const name = p.name.trim();
    return name.length > 0 && name !== "Unknown Product";
}

// ---------- reasons ----------

interface ReasonCandidate {
    reason: AlternativeReason;
    /** Relative size of the improvement (0-1+), to pick the most striking one. */
    strength: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The most striking way the candidate beats the scanned product, as a message key. */
export function pickReason(current: Product, candidate: Product): AlternativeReason {
    const unit = CATEGORY_RULES[getProductCategory(current.categoryTags)].sugarUnit === "100ml" ? "100 ml" : "100 g";
    const c = current.nutrients;
    const a = candidate.nutrients;
    const found: ReasonCandidate[] = [];

    const lower = (cur: number | undefined, cand: number | undefined, minAbs: number) =>
        cur !== undefined && cand !== undefined && cur - cand >= minAbs && (cur - cand) / cur >= 0.25
            ? (cur - cand) / cur
            : null;
    const higher = (cur: number | undefined, cand: number | undefined, minAbs: number) =>
        cur !== undefined && cand !== undefined && cand - cur >= minAbs ? (cand - cur) / (cur + 1) : null;

    const sugar = lower(c.sugars, a.sugars, 3);
    if (sugar !== null) {
        found.push({
            strength: sugar,
            reason: { key: "lessSugar", params: { from: round1(c.sugars!), to: round1(a.sugars!), unit } },
        });
    }
    const salt = lower(c.salt, a.salt, 0.3);
    if (salt !== null) {
        found.push({ strength: salt, reason: { key: "lessSalt", params: { from: round1(c.salt!), to: round1(a.salt!) } } });
    }
    const sat = lower(c.saturatedFat, a.saturatedFat, 1.5);
    if (sat !== null) {
        found.push({
            strength: sat,
            reason: { key: "lessSaturatedFat", params: { from: round1(c.saturatedFat!), to: round1(a.saturatedFat!) } },
        });
    }
    if (current.additives.length - candidate.additives.length >= 2) {
        found.push({
            strength: (current.additives.length - candidate.additives.length) / current.additives.length,
            reason: { key: "fewerAdditives", params: { from: current.additives.length, to: candidate.additives.length } },
        });
    }
    if (current.novaGroup === 4 && candidate.novaGroup !== undefined && candidate.novaGroup <= 3) {
        found.push({ strength: 0.3, reason: { key: "lessProcessed" } });
    }
    const protein = higher(c.proteins, a.proteins, 3);
    if (protein !== null) {
        found.push({
            strength: protein,
            reason: { key: "moreProtein", params: { from: round1(c.proteins!), to: round1(a.proteins!) } },
        });
    }
    const fiber = higher(c.fiber, a.fiber, 2);
    if (fiber !== null) {
        found.push({
            strength: fiber,
            reason: { key: "moreFiber", params: { from: round1(c.fiber!), to: round1(a.fiber!) } },
        });
    }

    if (found.length === 0) return { key: "betterScore" };
    // Stable choice: biggest relative improvement, then the order above.
    return found.reduce((best, next) => (next.strength > best.strength ? next : best)).reason;
}

// ---------- ranking ----------

interface Scored {
    product: Product;
    score: ReturnType<typeof scoreProduct>;
    effective: number;
    personalScore: number | null;
    status: VerdictStatus | null;
}

function effectiveScore(product: Product, universal: number, profile: PersonalProfile | null) {
    if (!profile) return { effective: universal, personalScore: null, status: null as VerdictStatus | null, usable: true };
    const verdict = evaluateProduct(product, profile, universal);
    // A candidate that conflicts with the profile, or cannot be verified for an allergy, is never suggested.
    const usable = verdict.status !== "not_suitable" && verdict.status !== "cannot_verify" && verdict.personalScore !== null;
    return { effective: verdict.personalScore ?? universal, personalScore: verdict.personalScore, status: verdict.status, usable };
}

export function rankAlternatives(input: RankInput): Alternative[] {
    const { current, currentScore, profile } = input;
    const limit = input.limit ?? MAX_ALTERNATIVES;
    const base = effectiveScore(current, currentScore, profile).effective;

    const seen = new Set<string>([current.barcode]);
    const scored: Scored[] = [];
    for (const candidate of input.candidates) {
        if (seen.has(candidate.barcode)) continue;
        seen.add(candidate.barcode);
        if (!hasUsableName(candidate) || knownNutrients(candidate) < MIN_KNOWN_NUTRIENTS) continue;

        const score = scoreProduct(candidate);
        const eff = effectiveScore(candidate, score.score, profile);
        if (!eff.usable) continue;
        if (eff.effective - base < MIN_SCORE_GAIN) continue;
        scored.push({ product: candidate, score, effective: eff.effective, personalScore: eff.personalScore, status: eff.status });
    }

    scored.sort(
        (x, y) =>
            y.effective - x.effective ||
            x.product.additives.length - y.product.additives.length ||
            (y.product.nutrients.proteins ?? 0) - (x.product.nutrients.proteins ?? 0) ||
            x.product.barcode.localeCompare(y.product.barcode)
    );

    return scored.slice(0, limit).map((s) => ({
        barcode: s.product.barcode,
        name: s.product.name,
        brand: s.product.brand,
        imageUrl: s.product.imageUrl,
        score: s.score.score,
        letter: s.score.letter,
        color: s.score.color,
        delta: s.effective - base,
        deltaIsPersonal: profile !== null,
        personalScore: s.personalScore,
        status: s.status,
        reason: pickReason(current, s.product),
        countriesTags: s.product.countriesTags,
    }));
}

/** True when the product is known to be sold in the country (OFF tag such as "en:tunisia"). */
export function isSoldIn(alternative: Pick<Alternative, "countriesTags">, countryTag: string | null): boolean | null {
    if (!countryTag) return null; // no country configured: say nothing
    if (alternative.countriesTags.length === 0) return null; // unknown
    return alternative.countriesTags.includes(countryTag);
}
