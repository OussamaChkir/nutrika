import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

const paths = (obj: Record<string, unknown>, prefix = ""): string[] =>
    Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]));
const get = (root: unknown, path: string) => path.split(".").reduce((o, k) => (o as Record<string, unknown>)?.[k], root);
const variables = (s: string) => [...new Set((s.match(/\{(\w+)[,}]/g) ?? []).map((m) => m.slice(1, -1)))].sort();

describe("Offline messages", () => {
    it("EN and FR have the same keys and variables, none empty", () => {
        const enPaths = paths(en.Offline).sort();
        expect(paths(fr.Offline).sort()).toEqual(enPaths);
        for (const path of enPaths) {
            expect(String(get(en.Offline, path)).length, `en ${path}`).toBeGreaterThan(0);
            expect(String(get(fr.Offline, path)).length, `fr ${path}`).toBeGreaterThan(0);
            expect(variables(String(get(fr.Offline, path))), path).toEqual(variables(String(get(en.Offline, path))));
        }
    });

    it("has a saved-age message for every unit describeAge can return", () => {
        for (const unit of ["justNow", "minutes", "hours", "days"]) {
            expect(en.Offline.lookup.savedAgo).toHaveProperty(unit);
            expect(fr.Offline.lookup.savedAgo).toHaveProperty(unit);
        }
    });

    it("the offline FAQ answer exists in both languages and does not promise what is not built", () => {
        for (const messages of [en, fr]) {
            const home = Object.values(messages).find((v) => typeof v === "object" && v !== null && "faq4AOffline" in v) as Record<string, string>;
            expect(home.faq4AOffline.length).toBeGreaterThan(50);
        }
        // The English text must say that unsaved products cannot be looked up offline.
        const homeEn = Object.values(en).find((v) => typeof v === "object" && v !== null && "faq4AOffline" in v) as Record<string, string>;
        expect(homeEn.faq4AOffline).toMatch(/not saved on your device cannot be looked up offline/i);
    });

    it("the privacy text says offline data never leaves the device", () => {
        expect(en.Privacy.collectList10).toMatch(/never sent/i);
        expect(fr.Privacy.collectList10).toMatch(/jamais envoyée/i);
    });
});
