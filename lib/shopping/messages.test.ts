import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { AISLES } from "./aisle";
import type { ScanFlagKind } from "./flags";
import { COMPARED_NUTRIENTS } from "./usual";
import type { ActionError } from "./types";

const paths = (obj: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
const get = (root: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)?.[k], root);

const FLAG_KINDS: ScanFlagKind[] = ["avoid", "approved", "approvedButCheck", "moreSugar", "moreSalt", "moreSaturatedFat"];
const ERRORS: ActionError[] = ["unauthorized", "invalid", "not_found", "limit", "disabled", "failed"];

describe("Shopping messages", () => {
    it("EN and FR have the same keys and placeholders, none empty", () => {
        const enPaths = paths(en.Shopping).sort();
        expect(paths(fr.Shopping).sort()).toEqual(enPaths);
        for (const path of enPaths) {
            expect(String(get(en.Shopping, path)).length, `en ${path}`).toBeGreaterThan(0);
            expect(String(get(fr.Shopping, path)).length, `fr ${path}`).toBeGreaterThan(0);
            expect(placeholders(String(get(fr.Shopping, path))), path).toEqual(placeholders(String(get(en.Shopping, path))));
        }
    });

    it("names every aisle, every flag, every error and the header link", () => {
        for (const locale of [en, fr]) {
            for (const a of AISLES) expect(locale.Shopping.aisles, a).toHaveProperty(a);
            for (const k of FLAG_KINDS) expect(locale.Shopping.flags, k).toHaveProperty(k);
            for (const e of ERRORS) expect(locale.Shopping.errors, e).toHaveProperty(e);
            expect(locale.Header.shoppingList.length).toBeGreaterThan(0);
        }
    });

    it("every flag message can be filled with what the comparison provides", () => {
        // moreSugar / moreSalt / moreSaturatedFat get { current, usual }; the others take nothing.
        for (const locale of [en, fr]) {
            for (const nutrient of COMPARED_NUTRIENTS) {
                const key = nutrient === "sugars" ? "moreSugar" : nutrient === "salt" ? "moreSalt" : "moreSaturatedFat";
                expect(placeholders((locale.Shopping.flags as Record<string, string>)[key])).toEqual(["{current}", "{usual}"]);
            }
            for (const k of ["avoid", "approved", "approvedButCheck"]) {
                expect(placeholders((locale.Shopping.flags as Record<string, string>)[k])).toEqual([]);
            }
        }
    });

    it("the privacy page and the delete warning mention the shopping list in both languages", () => {
        expect(en.Privacy.collectList7).toMatch(/shopping list/i);
        expect(fr.Privacy.collectList7).toMatch(/liste de courses/i);
        expect(en.AccountData.deleteWarning).toMatch(/shopping list/i);
        expect(fr.AccountData.deleteWarning).toMatch(/liste de courses/i);
        expect(en.Privacy.retentionList2).toMatch(/shopping list/i);
        expect(fr.Privacy.retentionList2).toMatch(/liste de courses/i);
    });
});
