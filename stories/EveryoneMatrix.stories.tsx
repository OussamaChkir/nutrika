import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { EveryoneMatrix, type EveryoneRow } from "@/components/everyone-matrix";
import type { OFFProduct } from "@/lib/openfoodfacts";
import { normalizeOffProduct } from "@/lib/product";
import type { PersonalProfile } from "@/lib/profiles/constants";
import { evaluateProduct } from "@/lib/profiles/evaluate";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

// Verdicts come from the real engine, so the story cannot drift from the app.

const profile = (overrides: Partial<PersonalProfile> = {}): PersonalProfile => ({
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    ...overrides,
});

const chocolateSpread: OFFProduct = {
    code: "3017620422003",
    ingredients_text: "Sugar, palm oil, hazelnuts 13%, skimmed milk powder, cocoa. May contain soy.",
    allergens_tags: ["en:milk", "en:nuts"],
    traces_tags: ["en:soybeans"],
    nutriments: { sugars_100g: 56, proteins_100g: 6, salt_100g: 0.1 },
    last_modified_t: 1_760_000_000,
};

const family: { id: string; name: string; profile: PersonalProfile }[] = [
    { id: "1", name: "Papa", profile: profile({ conditions: ["diabetes"] }) },
    { id: "2", name: "Sara", profile: profile({ allergens: ["Tree Nuts"] }) },
    { id: "3", name: "Yassine", profile: profile({ allergens: ["Soy"], allergenStrictness: "intentional_only" }) },
    { id: "4", name: "Mama", profile: profile({ goals: ["weight_loss"] }) },
    { id: "5", name: "Karim", profile: profile({ diets: ["vegan"], goals: ["muscle_gain"] }) },
];

const rowsFor = (product: OFFProduct, activeId = "1"): EveryoneRow[] =>
    family.map((m) => ({
        id: m.id,
        name: m.name,
        isActive: m.id === activeId,
        verdict: evaluateProduct(normalizeOffProduct(product), m.profile, 62),
    }));

const meta: Meta<typeof EveryoneMatrix> = {
    title: "Health/EveryoneMatrix",
    component: EveryoneMatrix,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider
                locale={context.parameters.locale ?? "en"}
                messages={context.parameters.locale === "fr" ? fr : en}
            >
                <div className="w-[460px]">
                    <Story />
                </div>
            </NextIntlClientProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof EveryoneMatrix>;

/** One product, five family members, five different verdicts. Open the panel to see them. */
export const Family: Story = { args: { rows: rowsFor(chocolateSpread) } };

/** The same table when the ingredient list is missing: allergy profiles say "cannot verify". */
export const MissingIngredients: Story = {
    args: { rows: rowsFor({ code: "123", nutriments: { sugars_100g: 56 } }, "2") },
};

export const French: Story = { args: { rows: rowsFor(chocolateSpread) }, parameters: { locale: "fr" } };
