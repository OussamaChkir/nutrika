import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { ALLERGY_OPTIONS } from "../allergens";
import { ALLERGEN_STRICTNESS, AGE_BANDS, CONDITIONS, DIETS, GOALS } from "./constants";

/** Every key path of a nested object, e.g. "reasons.saltHigh". */
function paths(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
}

const placeholders = (text: string) => (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort();

describe("personal score messages", () => {
    it("has a translation, in EN and FR, for every reason the engine can emit", () => {
        const source = readFileSync(join(__dirname, "evaluate.ts"), "utf8");
        const emitted = new Set([...source.matchAll(/key: "([A-Za-z]+)"/g)].map((m) => m[1]));
        expect(emitted.size).toBeGreaterThan(15);
        for (const locale of [en, fr]) {
            for (const key of emitted) {
                expect(Object.keys(locale.PersonalScore.reasons), key).toContain(key);
            }
        }
    });

    it("has the same keys in EN and FR (no missing translation)", () => {
        for (const ns of ["PersonalScore", "PersonalProfile", "MedicalDisclaimer"] as const) {
            expect(paths(fr[ns]).sort(), ns).toEqual(paths(en[ns]).sort());
        }
    });

    it("uses the same {placeholders} in EN and FR", () => {
        for (const ns of ["PersonalScore", "PersonalProfile"] as const) {
            const enPaths = paths(en[ns]);
            for (const path of enPaths) {
                const get = (root: unknown) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)[k], root);
                expect(placeholders(String(get(fr[ns]))), `${ns}.${path}`).toEqual(placeholders(String(get(en[ns]))));
            }
        }
    });

    it("labels every profile option the editor can show", () => {
        for (const locale of [en, fr]) {
            const p = locale.PersonalProfile;
            for (const c of CONDITIONS) expect(p.conditions, c).toHaveProperty(c);
            for (const d of DIETS) expect(p.diets, d).toHaveProperty(d);
            for (const g of GOALS) expect(p.goals, g).toHaveProperty(g);
            for (const a of AGE_BANDS) expect(p.ageBands, a).toHaveProperty(a);
            for (const s of ALLERGEN_STRICTNESS) expect(p.strictness, s).toHaveProperty(s);
            for (const reason of [...CONDITIONS, ...DIETS, ...GOALS, "allergy"]) {
                expect(locale.PersonalScore.because, reason).toHaveProperty(reason);
            }
        }
    });

    it("labels every allergen, in both languages", () => {
        for (const locale of [en, fr]) {
            const keys = Object.keys(locale.Profile);
            for (const label of ALLERGY_OPTIONS) {
                expect(keys, label).toContain(`allergy${label.replace(/\s/g, "")}`);
            }
        }
    });
});
