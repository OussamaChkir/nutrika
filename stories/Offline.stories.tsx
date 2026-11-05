import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { OfflineLookup } from "@/components/offline-lookup";
import { OfflineManager } from "@/components/offline-manager";
import { OfflineSettings } from "@/components/offline-settings";
import { DAY_MS, type ProfileSnapshot } from "@/lib/offline/policy";
import { clearAll, putProduct, setProfiles } from "@/lib/offline/store";
import { normalizeOffProduct } from "@/lib/product";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const PEANUT: ProfileSnapshot = {
    id: "p1",
    name: "Sami",
    isDefault: true,
    profile: { conditions: [], diets: [], goals: [], allergens: ["Peanuts"], allergenStrictness: "avoid_traces", ageBand: "adult" },
};

const biscuit = normalizeOffProduct({
    code: "20000001",
    product_name: "Chocolate biscuit",
    brands: "Example Brand",
    ingredients_text: "Flour, sugar, palm oil, peanuts, salt",
    allergens_tags: ["en:peanuts"],
    nutriments: { sugars_100g: 32, salt_100g: 0.7, "saturated-fat_100g": 9, fat_100g: 22, carbohydrates_100g: 62, proteins_100g: 6 },
});

const incomplete = normalizeOffProduct({
    code: "20000002",
    product_name: "Mystery spread",
    states_tags: ["en:ingredients-to-be-completed"],
    ingredients_text: "Sugar",
    nutriments: { sugars_100g: 1, salt_100g: 0.1, "saturated-fat_100g": 0.2 },
});

/** Puts a known state on the device before the story renders (Storybook has an empty IndexedDB). */
type SeedOptions = { products?: { product: ReturnType<typeof normalizeOffProduct>; ageDays: number }[]; profiles?: ProfileSnapshot[] };
const seed = (opts: SeedOptions): Decorator =>
    function SeedDecorator(Story) {
        return <Seeded opts={opts}><Story /></Seeded>;
    };

function Seeded({ opts, children }: { opts: SeedOptions; children: ReactNode }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            await clearAll();
            for (const { product, ageDays } of opts.products ?? []) await putProduct(product, Date.now() - ageDays * DAY_MS);
            await setProfiles(opts.profiles ?? null, opts.profiles?.[0]?.id ?? null);
            if (!cancelled) setReady(true);
        })();
        return () => { cancelled = true; };
    }, [opts]);
    return ready ? <>{children}</> : null;
}

const withIntl = (locale: "en" | "fr"): Decorator =>
    function IntlDecorator(Story) {
        return (
            <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en}>
                <Story />
            </NextIntlClientProvider>
        );
    };

const meta: Meta<typeof OfflineLookup> = {
    title: "Offline/OfflineLookup",
    component: OfflineLookup,
    parameters: { layout: "fullscreen" },
    decorators: [withIntl("en")],
};
export default meta;
type Story = StoryObj<typeof OfflineLookup>;

/** A product saved 3 days ago and a peanut-allergy profile: the verdict must be "not suitable". */
export const SavedProductWithAllergyProfile: Story = {
    args: { barcode: "20000001" },
    decorators: [seed({ products: [{ product: biscuit, ageDays: 3 }], profiles: [PEANUT] }), withIntl("en")],
};

/** Data older than 30 days: says it may be out of date. */
export const StaleData: Story = {
    args: { barcode: "20000001" },
    decorators: [seed({ products: [{ product: biscuit, ageDays: 45 }], profiles: [PEANUT] }), withIntl("en")],
};

/** Allergy profile and an incomplete ingredient list: "cannot verify", never green. */
export const IncompleteIngredientsWithAllergy: Story = {
    args: { barcode: "20000002" },
    decorators: [seed({ products: [{ product: incomplete, ageDays: 0 }], profiles: [PEANUT] }), withIntl("en")],
};

/** No profile saved: only the universal score. */
export const NoProfile: Story = {
    args: { barcode: "20000001" },
    decorators: [seed({ products: [{ product: biscuit, ageDays: 1 }] }), withIntl("en")],
};

/** Not on the device: "not saved", and the barcode is queued. */
export const UnknownBarcode: Story = {
    args: { barcode: "20000009" },
    decorators: [seed({}), withIntl("en")],
};

export const French: Story = {
    args: { barcode: "20000001" },
    decorators: [seed({ products: [{ product: biscuit, ageDays: 3 }], profiles: [PEANUT] }), withIntl("fr")],
};

export const Settings: StoryObj<typeof OfflineSettings> = {
    render: () => <OfflineSettings />,
    decorators: [seed({ products: [{ product: biscuit, ageDays: 3 }, { product: incomplete, ageDays: 1 }], profiles: [PEANUT] }), withIntl("en")],
};

/** The "Offline" pill: this story fakes a lost connection. */
export const OfflineBadge: StoryObj<typeof OfflineManager> = {
    render: () => <OfflineManager signedIn />,
    decorators: [withIntl("en")],
    play: async () => {
        Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
        window.dispatchEvent(new Event("offline"));
    },
};
