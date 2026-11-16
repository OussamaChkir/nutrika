import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import type { AlternativeReasonKey } from "./rank";

const paths = (obj: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
const get = (root: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)?.[k], root);

const REASON_KEYS: AlternativeReasonKey[] = [
    "lessSugar",
    "lessSalt",
    "lessSaturatedFat",
    "fewerAdditives",
    "lessProcessed",
    "moreProtein",
    "moreFiber",
    "betterScore",
];

describe("Alternatives messages", () => {
    it("EN and FR have the same keys and placeholders, none empty", () => {
        const enPaths = paths(en.Alternatives).sort();
        expect(paths(fr.Alternatives).sort()).toEqual(enPaths);
        for (const path of enPaths) {
            expect(String(get(en.Alternatives, path)).length, `en ${path}`).toBeGreaterThan(0);
            expect(String(get(fr.Alternatives, path)).length, `fr ${path}`).toBeGreaterThan(0);
            expect(placeholders(String(get(fr.Alternatives, path))), path).toEqual(placeholders(String(get(en.Alternatives, path))));
        }
    });

    it("has a message for every reason the ranking can give", () => {
        for (const locale of [en, fr]) for (const key of REASON_KEYS) expect(locale.Alternatives.reasons, key).toHaveProperty(key);
    });

    it("has a message for every verdict status that can reach the list", () => {
        for (const locale of [en, fr]) for (const s of ["caution", "good_match"]) expect(locale.Alternatives.status, s).toHaveProperty(s);
    });
});
