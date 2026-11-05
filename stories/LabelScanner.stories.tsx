import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { LabelScanner } from "@/components/label-scanner";
import type { Extraction } from "@/lib/label/schema";
import type { PersonalProfile } from "@/lib/profiles/constants";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const peanutProfile: PersonalProfile = {
    conditions: [],
    diets: [],
    goals: [],
    allergens: ["Peanuts"],
    allergenStrictness: "avoid_traces",
};

const reading = (over: Partial<Extraction> = {}, form: Partial<Extraction["form"]> = {}): Extraction => ({
    form: {
        productName: "Chocolate wafer",
        brand: "Example Brand",
        kind: "food",
        ingredientsText: "Wheat flour, sugar, palm oil, cocoa powder, skimmed milk powder, emulsifier (soy lecithin)",
        ingredientsComplete: true,
        allergensContains: ["wheat", "milk", "soy"],
        allergensMayContain: ["peanuts"],
        nutrition: { energyKcal: 510, fat: 26, saturatedFat: 12, carbohydrates: 62, sugars: 38, fiber: 2.5, proteins: 6, salt: 0.4 },
        ...form,
    },
    warnings: [],
    confidence: 0.92,
    readable: "good",
    language: "en",
    ...over,
});

const meta: Meta<typeof LabelScanner> = {
    title: "Scan/LabelScanner",
    component: LabelScanner,
    parameters: { layout: "fullscreen" },
    args: { availability: "ready", tier: "free", remaining: 5, profiles: [], activeId: null },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider locale={context.parameters.locale ?? "en"} messages={context.parameters.locale === "fr" ? fr : en}>
                <Story />
            </NextIntlClientProvider>
        ),
    ],
};
export default meta;
type Story = StoryObj<typeof LabelScanner>;

/** The user has not agreed yet: both photo buttons are disabled until the box is ticked. */
export const ConsentFreeTier: Story = {};
export const ConsentPaidTier: Story = { args: { tier: "paid" } };
export const NoPhotosLeftToday: Story = { args: { remaining: 0 } };
export const FrenchConsent: Story = { parameters: { locale: "fr" } };

export const BlockedInEurope: Story = { args: { availability: "region" } };
export const RegionUnknown: Story = { args: { availability: "unknown_region" } };
export const NotConfigured: Story = { args: { availability: "not_configured" } };

/** Review step with a clean reading. Press "Confirm" to see the result. */
export const ReviewClean: Story = { args: { initialExtraction: reading() } };

/** Review step with warnings: partial photo, per-serving table converted, sodium converted. */
export const ReviewWithWarnings: Story = {
    args: {
        initialExtraction: reading(
            {
                readable: "partial",
                confidence: 0.55,
                warnings: [{ code: "partial" }, { code: "lowConfidence" }, { code: "perServingConverted" }, { code: "saltFromSodium" }, { code: "valueRemoved", field: "sugars" }],
            },
            { ingredientsComplete: false, nutrition: { energyKcal: 500, fat: 25, saturatedFat: 12, carbohydrates: 60, sugars: null, fiber: null, proteins: 6, salt: 1 } }
        ),
    },
};

/** A peanut allergy and a "may contain peanuts" label: the result must say not suitable. */
export const ReviewPeanutAllergy: Story = {
    args: {
        initialExtraction: reading(),
        profiles: [{ id: "p1", name: "Sami", profile: peanutProfile }],
        activeId: "p1",
    },
};

/** A peanut allergy but the list is not confirmed complete: the result must say it cannot be verified, never safe. */
export const ReviewAllergyIncompleteList: Story = {
    args: {
        initialExtraction: reading({ readable: "partial", warnings: [{ code: "partial" }] }, { ingredientsComplete: false, allergensMayContain: [] }),
        profiles: [{ id: "p1", name: "Sami", profile: peanutProfile }],
        activeId: "p1",
    },
};

export const ReviewFrench: Story = { args: { initialExtraction: reading() }, parameters: { locale: "fr" } };
