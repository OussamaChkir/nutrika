import { describe, expect, it } from "vitest";

import { pickActiveProfile } from "./active";
import { evaluateProduct } from "./evaluate";
import { mostSevereReason } from "./summary";
import { normalizeOffProduct } from "../product";

const p = (id: string, isDefault = false, createdAt?: string) => ({ id, isDefault, createdAt });

describe("pickActiveProfile", () => {
    const profiles = [p("a", false, "2026-01-01"), p("b", true, "2026-02-01"), p("c", false, "2026-03-01")];

    it("returns null when there are no profiles", () => {
        expect(pickActiveProfile([], "a")).toBeNull();
        expect(pickActiveProfile([])).toBeNull();
    });

    it("prefers the profile named by the cookie", () => {
        expect(pickActiveProfile(profiles, "c")?.id).toBe("c");
    });

    it("falls back to the default profile when there is no cookie", () => {
        expect(pickActiveProfile(profiles)?.id).toBe("b");
        expect(pickActiveProfile(profiles, null)?.id).toBe("b");
        expect(pickActiveProfile(profiles, "")?.id).toBe("b");
    });

    it("ignores a cookie that is not one of the user's profiles (deleted, stale or forged)", () => {
        expect(pickActiveProfile(profiles, "someone-elses-profile")?.id).toBe("b");
        expect(pickActiveProfile(profiles, "665f1c2e9b1e8a3f4c5d6e7f")?.id).toBe("b");
    });

    it("falls back to the oldest profile when none is the default", () => {
        const noDefault = [p("late", false, "2026-05-01"), p("early", false, "2026-01-01")];
        expect(pickActiveProfile(noDefault)?.id).toBe("early");
    });

    it("keeps the first profile when creation dates are missing", () => {
        expect(pickActiveProfile([p("x"), p("y")])?.id).toBe("x");
    });

    it("does not reorder or mutate its input", () => {
        const input = [p("late", false, "2026-05-01"), p("early", false, "2026-01-01")];
        const copy = structuredClone(input);
        pickActiveProfile(input);
        expect(input).toEqual(copy);
    });
});

describe("mostSevereReason", () => {
    const profile = {
        conditions: ["diabetes"] as const,
        diets: [] as const,
        goals: ["muscle_gain"] as const,
        allergens: ["Milk"] as const,
        allergenStrictness: "avoid_traces" as const,
    };
    const verdict = (off: Parameters<typeof normalizeOffProduct>[0]) =>
        evaluateProduct(normalizeOffProduct(off), profile, 70);

    it("puts a blocking reason first, even when there is good news", () => {
        const v = verdict({
            code: "1",
            ingredients_text: "Whey",
            allergens_tags: ["en:milk"],
            nutriments: { proteins_100g: 30, sugars_100g: 40 },
        });
        expect(mostSevereReason(v)?.level).toBe("block");
        expect(mostSevereReason(v)?.key).toBe("allergenContains");
    });

    it("then caution, then unknown, then good", () => {
        const caution = verdict({ code: "1", ingredients_text: "Rice", nutriments: { sugars_100g: 40 } });
        expect(mostSevereReason(caution)?.level).toBe("caution");
        const unknown = verdict({ code: "1", nutriments: { sugars_100g: 1 } });
        expect(mostSevereReason(unknown)?.level).toBe("unknown");
        const good = verdict({ code: "1", ingredients_text: "Rice", nutriments: { sugars_100g: 1 } });
        expect(mostSevereReason(good)?.level).toBe("good");
    });

    it("is null when there is nothing to say", () => {
        expect(mostSevereReason({ reasons: [] })).toBeNull();
    });
});
