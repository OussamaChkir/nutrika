import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { PersonalScoreCard } from "@/components/personal-score-card";
import type { OFFProduct } from "@/lib/openfoodfacts";
import { normalizeOffProduct } from "@/lib/product";
import type { PersonalProfile } from "@/lib/profiles/constants";
import { evaluateProduct } from "@/lib/profiles/evaluate";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

// The verdicts below come from the real engine, so the stories cannot drift from the app.

const profile = (overrides: Partial<PersonalProfile> = {}): PersonalProfile => ({
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    ...overrides,
});

const off = (overrides: Partial<OFFProduct> = {}): OFFProduct => ({
    code: "3017620422003",
    ingredients_text: "Sugar, palm oil, hazelnuts 13%, skimmed milk powder, cocoa",
    last_modified_t: 1_760_000_000,
    ...overrides,
});

const verdict = (product: OFFProduct, prof: PersonalProfile, universal = 62) =>
    evaluateProduct(normalizeOffProduct(product), prof, universal);

const meta: Meta<typeof PersonalScoreCard> = {
    title: "Health/PersonalScoreCard",
    component: PersonalScoreCard,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider
                locale={context.parameters.locale ?? "en"}
                messages={context.parameters.locale === "fr" ? fr : en}
            >
                <div className="w-[420px]">
                    <Story />
                </div>
            </NextIntlClientProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PersonalScoreCard>;

/** A product that contains an allergen from the profile. */
export const NotSuitable: Story = {
    args: {
        profileName: "Sara",
        verdict: verdict(
            off({ allergens_tags: ["en:milk", "en:nuts"], nutriments: { sugars_100g: 56 } }),
            profile({ allergens: ["Milk", "Peanuts"], conditions: ["diabetes"] })
        ),
    },
};

/** "May contain" with the strict setting (avoid traces): not suitable. */
export const MayContainStrict: Story = {
    args: {
        profileName: "Yassine",
        verdict: verdict(off({ traces_tags: ["en:peanuts"] }), profile({ allergens: ["Peanuts"], allergenStrictness: "avoid_traces" })),
    },
};

/** "May contain" with the relaxed setting (ingredients only): caution. */
export const MayContainRelaxed: Story = {
    args: {
        profileName: "Yassine",
        verdict: verdict(
            off({ traces_tags: ["en:peanuts"] }),
            profile({ allergens: ["Peanuts"], allergenStrictness: "intentional_only" }),
            80
        ),
    },
};

export const Caution: Story = {
    args: {
        profileName: "Papa",
        verdict: verdict(
            off({ nutriments: { sugars_100g: 30, salt_100g: 2.1 } }),
            profile({ conditions: ["diabetes", "hypertension"] })
        ),
    },
};

/** Ingredient list missing: never green for an allergy, and the score is hidden. */
export const CannotVerify: Story = {
    args: {
        profileName: "Sara",
        verdict: verdict(
            { code: "123", nutriments: { proteins_100g: 22 } },
            profile({ allergens: ["Eggs"], goals: ["muscle_gain"] }),
            84
        ),
    },
};

export const GoodMatch: Story = {
    args: {
        profileName: "Karim",
        verdict: verdict(
            off({
                ingredients_text: "Whey protein, cocoa",
                nutriments: { proteins_100g: 78, sugars_100g: 4 },
                labels_tags: ["en:no-lactose"],
            }),
            profile({ goals: ["muscle_gain"], allergens: ["Lactose", "Peanuts"] }),
            71
        ),
    },
};

/** A profile with nothing that applies to the product: judged as neutral, not green. */
export const Neutral: Story = {
    args: { profileName: "Me", verdict: verdict(off(), profile(), 70) },
};

/** Ingredients flagged incomplete on Open Food Facts. */
export const IncompleteData: Story = {
    args: {
        profileName: "Sara",
        verdict: verdict(
            off({ states_tags: ["en:ingredients-to-be-completed"] }),
            profile({ allergens: ["Gluten"] })
        ),
    },
};

export const French: Story = {
    args: {
        profileName: "Sara",
        verdict: verdict(
            off({ ingredients_text: "Farine de blé, lait écrémé. Peut contenir des traces de soja." }),
            profile({ allergens: ["Gluten", "Soy"], conditions: ["hypertension"] })
        ),
    },
    parameters: { locale: "fr" },
};
