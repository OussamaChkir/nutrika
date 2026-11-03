import { describe, expect, it } from "vitest";

import { AISLES, aisleFor, groupByAisle } from "./aisle";
import { buildScanFlags } from "./flags";
import { planAdd, remainingCount, sortItems, type ListItem } from "./list";
import { cleanLabel, clampQuantity, isBarcode, isObjectId, MAX_LABEL_LENGTH, MAX_LIST_ITEMS, MAX_QUANTITY, nextState, parseSavedState } from "./rules";
import { buildShareText, smsUrl, whatsappUrl } from "./share";
import { compareWithUsual, type Comparable } from "./usual";

const item = (over: Partial<ListItem> = {}): ListItem => ({
    id: "a1",
    barcode: null,
    label: "Bread",
    quantity: 1,
    checked: false,
    createdAt: 1,
    ...over,
});

describe("rules", () => {
    it("parses only the two saved states", () => {
        expect(parseSavedState("approved")).toBe("approved");
        expect(parseSavedState("avoid")).toBe("avoid");
        for (const bad of ["APPROVED", "", null, undefined, 1, {}]) expect(parseSavedState(bad)).toBeNull();
    });

    it("toggles: the same state clears, the other switches", () => {
        expect(nextState(null, "approved")).toBe("approved");
        expect(nextState("approved", "approved")).toBeNull();
        expect(nextState("approved", "avoid")).toBe("avoid");
        expect(nextState("avoid", "avoid")).toBeNull();
    });

    it("validates ids and barcodes", () => {
        expect(isObjectId("507f1f77bcf86cd799439011")).toBe(true);
        for (const bad of ["", "123", "507f1f77bcf86cd79943901z", "../etc", 5, null]) expect(isObjectId(bad)).toBe(false);
        expect(isBarcode("3017620422003")).toBe(true);
        for (const bad of ["abc", "123", "30176204220031234", "3017 6204", "3017620422003; drop", 5]) expect(isBarcode(bad)).toBe(false);
    });

    it("cleans labels: trims, collapses spaces, strips control characters, caps length", () => {
        expect(cleanLabel("  Whole   milk \n 1L ")).toBe("Whole milk 1L");
        expect(cleanLabel("a\u0000b\u0007c")).toBe("a b c");
        expect(cleanLabel("   ")).toBeNull();
        expect(cleanLabel(undefined)).toBeNull();
        expect(cleanLabel(42)).toBeNull();
        expect(cleanLabel("x".repeat(500))).toHaveLength(MAX_LABEL_LENGTH);
    });

    it("keeps Arabic and French text intact", () => {
        expect(cleanLabel("حليب كامل الدسم")).toBe("حليب كامل الدسم");
        expect(cleanLabel("Crème fraîche")).toBe("Crème fraîche");
    });

    it("clamps quantities to a whole number between 1 and 99", () => {
        expect(clampQuantity(0)).toBe(1);
        expect(clampQuantity(-5)).toBe(1);
        expect(clampQuantity(2.6)).toBe(3);
        expect(clampQuantity(1000)).toBe(MAX_QUANTITY);
        expect(clampQuantity("4")).toBe(4);
        for (const bad of ["x", NaN, Infinity, undefined, null]) expect(clampQuantity(bad)).toBeGreaterThanOrEqual(1);
    });
});

describe("planAdd", () => {
    it("creates a new line", () => {
        const plan = planAdd([], { barcode: "123456789", label: "Milk", category: "en:milks", quantity: 2 });
        expect(plan).toEqual({ type: "create", data: { barcode: "123456789", label: "Milk", category: "en:milks", quantity: 2 } });
    });

    it("raises the quantity of an unchecked product already on the list", () => {
        const plan = planAdd([item({ id: "x", barcode: "123456789", quantity: 2 })], { barcode: "123456789", label: "Milk", quantity: 3 });
        expect(plan).toEqual({ type: "increment", id: "x", quantity: 5 });
    });

    it("never goes over the maximum quantity", () => {
        const plan = planAdd([item({ id: "x", barcode: "123456789", quantity: 98 })], { barcode: "123456789", label: "Milk", quantity: 5 });
        expect(plan).toEqual({ type: "increment", id: "x", quantity: MAX_QUANTITY });
    });

    it("starts a new line when the earlier one is already checked off", () => {
        const plan = planAdd([item({ barcode: "123456789", checked: true })], { barcode: "123456789", label: "Milk", quantity: 1 });
        expect(plan.type).toBe("create");
    });

    it("matches free text by label, ignoring case and spaces, and never mixes it with products", () => {
        expect(planAdd([item({ id: "t", label: "Bread" })], { barcode: null, label: " bread ", quantity: 1 }).type).toBe("increment");
        expect(planAdd([item({ id: "p", barcode: "123456789", label: "Bread" })], { barcode: null, label: "Bread", quantity: 1 }).type).toBe("create");
    });

    it("refuses to grow past the item limit but still lets quantity change", () => {
        const full = Array.from({ length: MAX_LIST_ITEMS }, (_, i) => item({ id: `i${i}`, label: `Item ${i}` }));
        expect(planAdd(full, { barcode: null, label: "One more", quantity: 1 })).toEqual({ type: "error", code: "limit" });
        expect(planAdd(full, { barcode: null, label: "Item 3", quantity: 1 }).type).toBe("increment");
    });

    it("clamps the incoming quantity", () => {
        const plan = planAdd([], { barcode: null, label: "Tea", quantity: 5000 });
        expect(plan.type === "create" && plan.data.quantity).toBe(MAX_QUANTITY);
    });
});

describe("sortItems and remainingCount", () => {
    it("puts items to buy first (oldest first) and bought items last", () => {
        const items = [
            item({ id: "c", checked: true, createdAt: 1 }),
            item({ id: "b", createdAt: 3 }),
            item({ id: "a", createdAt: 2 }),
        ];
        expect(sortItems(items).map((i) => i.id)).toEqual(["a", "b", "c"]);
        expect(remainingCount(items)).toBe(2);
    });
    it("does not mutate its input", () => {
        const items = [item({ id: "b", createdAt: 2 }), item({ id: "a", createdAt: 1 })];
        sortItems(items);
        expect(items.map((i) => i.id)).toEqual(["b", "a"]);
    });
});

describe("aisleFor", () => {
    it.each([
        [["en:plant-based-foods-and-beverages", "en:beverages", "en:sodas", "en:colas"], "drinks"],
        [["en:snacks", "en:sweet-snacks", "en:biscuits-and-cakes", "en:biscuits", "en:chocolate-biscuits"], "snacks"],
        [["en:dairies", "en:cheeses"], "dairy"],
        [["en:spreads", "en:sweet-spreads", "en:chocolate-spreads"], "pantry"],
        [["en:plant-based-foods", "en:legumes-and-their-products", "en:peanut-butters"], "pantry"],
        [["en:beverages", "en:fruit-juices"], "drinks"],
        [["en:frozen-foods", "en:ice-creams-and-sorbets"], "frozen"],
        [["en:plant-based-foods", "en:cereals-and-potatoes", "en:breakfast-cereals"], "pantry"],
        [["en:plant-based-foods", "en:fruits-and-vegetables-based-foods", "en:fruits"], "produce"],
        [["en:meats", "en:sausages"], "meat_fish"],
        [["en:breads"], "bakery"],
        [["en:snacks", "en:cereal-bars"], "snacks"],
        [["en:tomato-sauces"], "pantry"],
        [["en:dairies", "en:yogurts"], "dairy"],
        [["en:dairies", "en:yoghurts"], "dairy"],
        [["en:dairies", "en:yogourts"], "dairy"],
    ] as const)("%j -> %s", (tags, aisle) => {
        expect(aisleFor(tags as unknown as string[])).toBe(aisle);
    });

    it("uses the most specific tags, not a generic parent", () => {
        // 'beverages' appears in the generic parent of many foods; it must not win over a specific tag.
        expect(aisleFor(["en:plant-based-foods-and-beverages", "en:plant-based-foods", "en:breakfast-cereals"])).toBe("pantry");
    });

    it("does not match part of a word", () => {
        expect(aisleFor(["en:salted-snacks"])).toBe("snacks");
        expect(aisleFor(["en:barley-flakes"])).not.toBe("snacks"); // 'bar' inside 'barley'
        expect(aisleFor(["en:waterproof-things"])).toBe("other");
    });

    it("falls back to 'other' for unknown, empty or missing tags", () => {
        expect(aisleFor(["en:xyzzy"])).toBe("other");
        expect(aisleFor([])).toBe("other");
        expect(aisleFor(null)).toBe("other");
        expect(aisleFor(undefined)).toBe("other");
    });

    it("accepts a single tag string, with or without a language prefix", () => {
        expect(aisleFor("en:yogurts")).toBe("dairy");
        expect(aisleFor("yogurts")).toBe("dairy");
        expect(aisleFor("fr:fromages")).toBe("other"); // only English tags are mapped
    });
});

describe("groupByAisle", () => {
    it("returns aisles in a fixed order, skips empty ones and keeps item order", () => {
        const groups = groupByAisle([
            { id: 1, category: "en:colas" },
            { id: 2, category: "en:cheeses" },
            { id: 3, category: null },
            { id: 4, category: "en:sodas" },
        ]);
        expect(groups.map((g) => g.aisle)).toEqual(["dairy", "drinks", "other"]);
        expect(groups[1].items.map((i) => i.id)).toEqual([1, 4]);
        expect(groups.map((g) => g.aisle)).toEqual(AISLES.filter((a) => groups.some((g) => g.aisle === a)));
    });
    it("handles an empty list", () => expect(groupByAisle([])).toEqual([]));
});

const peer = (over: Partial<Comparable> = {}): Comparable => ({ barcode: "P", category: "en:chocolate-spreads", sugars: 20, salt: 0.1, saturatedFat: 5, ...over });

describe("compareWithUsual", () => {
    it("flags a nutrient that is clearly higher than the usual product in the same category", () => {
        const out = compareWithUsual(peer({ barcode: "NEW", sugars: 50 }), [peer({ barcode: "OLD", sugars: 20 })]);
        expect(out).toEqual([{ nutrient: "sugars", current: 50, usual: 20 }]);
    });

    it("says nothing when the product is the same or better", () => {
        expect(compareWithUsual(peer({ barcode: "NEW", sugars: 20 }), [peer({ barcode: "OLD" })])).toEqual([]);
        expect(compareWithUsual(peer({ barcode: "NEW", sugars: 5 }), [peer({ barcode: "OLD" })])).toEqual([]);
    });

    it("needs both a relative and an absolute difference", () => {
        // +2 g sugar on 4 g is +50% but under the 3 g minimum.
        expect(compareWithUsual(peer({ barcode: "N", sugars: 6 }), [peer({ barcode: "O", sugars: 4 })])).toEqual([]);
        // +4 g on 40 g is over 3 g but only +10%.
        expect(compareWithUsual(peer({ barcode: "N", sugars: 44 }), [peer({ barcode: "O", sugars: 40 })])).toEqual([]);
    });

    it("only compares with the same category, and never with itself", () => {
        expect(compareWithUsual(peer({ barcode: "N", sugars: 50 }), [peer({ barcode: "O", category: "en:biscuits" })])).toEqual([]);
        expect(compareWithUsual(peer({ barcode: "N", sugars: 50 }), [peer({ barcode: "N", sugars: 5 })])).toEqual([]);
    });

    it("does nothing without a category or without approved products", () => {
        expect(compareWithUsual(peer({ barcode: "N", category: null, sugars: 50 }), [peer({ barcode: "O", category: null })])).toEqual([]);
        expect(compareWithUsual(peer({ barcode: "N", sugars: 50 }), [])).toEqual([]);
    });

    it("uses the median when there are several usual products", () => {
        const approved = [peer({ barcode: "1", sugars: 10 }), peer({ barcode: "2", sugars: 12 }), peer({ barcode: "3", sugars: 60 })];
        const out = compareWithUsual(peer({ barcode: "N", sugars: 30 }), approved);
        expect(out).toEqual([{ nutrient: "sugars", current: 30, usual: 12 }]);
    });

    it("skips nutrients with missing data instead of treating them as zero", () => {
        const out = compareWithUsual(peer({ barcode: "N", sugars: undefined, salt: 1.5 }), [peer({ barcode: "O", salt: 0.2 })]);
        expect(out.map((c) => c.nutrient)).toEqual(["salt"]);
        expect(compareWithUsual(peer({ barcode: "N", sugars: 50 }), [peer({ barcode: "O", sugars: null })])).toEqual([]);
    });

    it("handles a usual value of zero", () => {
        expect(compareWithUsual(peer({ barcode: "N", sugars: 10 }), [peer({ barcode: "O", sugars: 0 })])[0]).toMatchObject({ nutrient: "sugars", usual: 0 });
    });
});

describe("buildScanFlags", () => {
    it("warns for avoid", () => {
        expect(buildScanFlags({ state: "avoid", comparisons: [] })).toEqual([{ kind: "avoid", severity: "warning" }]);
    });

    it("says approved when nothing contradicts it", () => {
        for (const verdictStatus of ["good_match", "neutral", "caution", null, undefined] as const) {
            expect(buildScanFlags({ state: "approved", comparisons: [], verdictStatus })[0]).toEqual({ kind: "approved", severity: "positive" });
        }
    });

    it("never reads as a green light when the verdict is not suitable or cannot be verified", () => {
        for (const verdictStatus of ["not_suitable", "cannot_verify"] as const) {
            expect(buildScanFlags({ state: "approved", comparisons: [], verdictStatus })).toEqual([{ kind: "approvedButCheck", severity: "warning" }]);
        }
    });

    it("turns comparisons into flags in a fixed order, only when the product is not approved", () => {
        const comparisons = [
            { nutrient: "salt", current: 2, usual: 0.5 },
            { nutrient: "sugars", current: 30, usual: 10 },
        ] as const;
        const flags = buildScanFlags({ state: null, comparisons });
        expect(flags.map((f) => f.kind)).toEqual(["moreSalt", "moreSugar"]);
        expect(flags[1].params).toEqual({ current: 30, usual: 10 });
        expect(buildScanFlags({ state: "approved", comparisons })).toHaveLength(1);
    });

    it("an avoided product also gets the comparison notes", () => {
        const flags = buildScanFlags({ state: "avoid", comparisons: [{ nutrient: "sugars", current: 30, usual: 10 }] });
        expect(flags.map((f) => f.kind)).toEqual(["avoid", "moreSugar"]);
    });

    it("no state and no comparison means no flags", () => {
        expect(buildScanFlags({ state: null, comparisons: [] })).toEqual([]);
    });
});

describe("share", () => {
    const labels = { title: "Shopping list", footer: "nutrikafood.com" };

    it("lists only what is still to buy, with quantities", () => {
        const text = buildShareText(
            [item({ label: "Milk", quantity: 2 }), item({ id: "b", label: "Bread" }), item({ id: "c", label: "Eggs", checked: true })],
            labels
        );
        expect(text).toBe("Shopping list\n\n- 2 x Milk\n- Bread\n\nnutrikafood.com");
    });

    it("returns null when nothing is left", () => {
        expect(buildShareText([], labels)).toBeNull();
        expect(buildShareText([item({ checked: true })], labels)).toBeNull();
    });

    it("works without a footer", () => {
        expect(buildShareText([item()], { title: "List" })).toBe("List\n\n- Bread");
    });

    it("encodes the text for links, including accents, Arabic and line breaks", () => {
        const text = "Liste\n\n- 2 x Crème & lait\n- حليب";
        const wa = whatsappUrl(text);
        expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
        expect(decodeURIComponent(wa.split("text=")[1])).toBe(text);
        expect(wa).not.toMatch(/[\s&](?=.*text=)/);
        expect(decodeURIComponent(smsUrl(text).split("body=")[1])).toBe(text);
        expect(smsUrl(text).startsWith("sms:?&body=")).toBe(true);
    });
});
