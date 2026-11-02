import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { ADDITIVE_CATEGORIES, ADDITIVE_EVIDENCE } from "./schema";

/** Every key path of a nested object, e.g. "evidenceLevels.strong.label". */
function paths(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
const get = (root: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)?.[k], root);

describe("Additives messages", () => {
    it("EN and FR have the same keys and placeholders, none empty", () => {
        const enPaths = paths(en.Additives).sort();
        expect(paths(fr.Additives).sort()).toEqual(enPaths);
        for (const path of enPaths) {
            expect(String(get(en.Additives, path)).length, `en ${path}`).toBeGreaterThan(0);
            expect(placeholders(String(get(fr.Additives, path))), path).toEqual(placeholders(String(get(en.Additives, path))));
        }
    });

    it("labels every category and every evidence level the data can use", () => {
        for (const locale of [en, fr]) {
            for (const c of ADDITIVE_CATEGORIES) expect(locale.Additives.categories, c).toHaveProperty(c);
            for (const e of ADDITIVE_EVIDENCE) {
                expect(locale.Additives.evidenceLevels, e).toHaveProperty(e);
                expect(get(locale.Additives.evidenceLevels, `${e}.label`), e).toBeTruthy();
                expect(get(locale.Additives.evidenceLevels, `${e}.desc`), e).toBeTruthy();
            }
        }
    });
});
