import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import fr from "../messages/fr.json";

import { PRIVACY_SECTIONS, privacyKeys } from "./privacy-sections";

const bundles = { en: en.Privacy as Record<string, string>, fr: fr.Privacy as Record<string, string> };

describe("Privacy page messages", () => {
    it.each(["en", "fr"] as const)("%s has every key the page renders, none empty", (locale) => {
        for (const key of privacyKeys()) {
            expect(bundles[locale][key], `${locale}: ${key}`).toBeTruthy();
        }
    });

    it("EN and FR have the same keys (no orphan text)", () => {
        expect(Object.keys(bundles.fr).sort()).toEqual(Object.keys(bundles.en).sort());
    });

    it("section ids are unique and numbered titles follow the page order", () => {
        const ids = PRIVACY_SECTIONS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const locale of ["en", "fr"] as const) {
            ids.forEach((id, i) => {
                expect(bundles[locale][`${id}Title`].startsWith(`${i + 1}.`), `${locale}: ${id}`).toBe(true);
            });
        }
    });

    it("never promises something the product does not do", () => {
        // Guard rails for the claims a reviewer must keep true.
        const text = Object.values(bundles.en).join(" ").toLowerCase();
        expect(text).not.toContain("we sell");
        expect(text).toContain("do not sell");
    });
});
