import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { LABEL_ERROR_CODES } from "./errors";
import { KINDS, NUTRIENT_FIELDS, type LabelWarningCode } from "./schema";

const paths = (obj: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
// ICU placeholders such as {count} or {field}; "plural" bodies are compared by their variable names.
const variables = (s: string) => [...new Set((s.match(/\{(\w+)[,}]/g) ?? []).map((m) => m.slice(1, -1)))].sort();
const get = (root: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)?.[k], root);

const WARNING_CODES: LabelWarningCode[] = [
    "unreadable", "partial", "lowConfidence", "noIngredients", "perServingConverted", "perServingNoSize", "saltFromSodium", "valueRemoved", "basisUnknown",
];

describe("Label messages", () => {
    it("EN and FR have the same keys and variables, none empty", () => {
        const enPaths = paths(en.Label).sort();
        expect(paths(fr.Label).sort()).toEqual(enPaths);
        for (const path of enPaths) {
            expect(String(get(en.Label, path)).length, `en ${path}`).toBeGreaterThan(0);
            expect(String(get(fr.Label, path)).length, `fr ${path}`).toBeGreaterThan(0);
            expect(variables(String(get(fr.Label, path))), path).toEqual(variables(String(get(en.Label, path))));
        }
    });

    it.each([
        ["en", en],
        ["fr", fr],
    ])("%s has a message for every error, warning, kind, nutrient and unavailable reason", (_name, locale) => {
        for (const code of LABEL_ERROR_CODES) expect(locale.Label.errors, code).toHaveProperty(code);
        for (const code of WARNING_CODES) expect(locale.Label.warnings, code).toHaveProperty(code);
        for (const k of KINDS) expect(locale.Label.kinds, k).toHaveProperty(k);
        for (const f of NUTRIENT_FIELDS) expect(locale.Label.nutrients, f).toHaveProperty(f);
        for (const r of ["region", "unknown_region", "not_configured"]) expect(locale.Label.unavailable, r).toHaveProperty(r);
        for (const tier of ["free", "paid"]) expect(locale.Label.consent, tier).toHaveProperty(tier);
    });

    it("the free-tier consent tells the user Google may use and read the photo", () => {
        expect(en.Label.consent.free.body).toMatch(/improve its products/i);
        expect(en.Label.consent.free.body).toMatch(/read it/i);
        expect(fr.Label.consent.free.body).toMatch(/améliorer ses produits/i);
    });
});
