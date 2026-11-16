import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { AdditiveChips, type AdditiveChipItem } from "@/components/additive-chips";
import { buildIndex, forYouNotes, getAdditiveInfo } from "@/lib/additives/lookup";
import { ADDITIVES } from "@/lib/additives/registry";
import type { AdditiveLocale } from "@/lib/additives/schema";
import type { PersonalProfile } from "@/lib/profiles/constants";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

// Built from the real knowledge base and lookup, so the story cannot drift from the app.
// Drafts are included here on purpose: nothing is reviewed yet, and a reviewer needs to see them.

const index = buildIndex(ADDITIVES);

const profile = (overrides: Partial<PersonalProfile> = {}): PersonalProfile => ({
    conditions: [],
    diets: [],
    goals: [],
    allergens: [],
    allergenStrictness: "avoid_traces",
    ...overrides,
});

const items = (codes: string[], locale: AdditiveLocale, forProfile: PersonalProfile | null): AdditiveChipItem[] =>
    codes.map((code) => {
        const view = getAdditiveInfo(index, code, locale, { includeDrafts: true });
        return { code, view, forYou: view ? forYouNotes(view, forProfile) : [] };
    });

const meta: Meta<typeof AdditiveChips> = {
    title: "Ingredients/AdditiveChips",
    component: AdditiveChips,
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
type Story = StoryObj<typeof AdditiveChips>;

/** Tap a chip to open the bottom sheet. E150d has no entry yet, so its sheet says so. */
export const Default: Story = { args: { items: items(["E102", "E951", "E150d", "E471"], "en", null) } };

/** A vegan profile and a child profile see "For you" notes (badge on the chip, box in the sheet). */
export const ForYouVegan: Story = { args: { items: items(["E120", "E471", "E330"], "en", profile({ diets: ["vegan"] })) } };

export const ForYouChild: Story = { args: { items: items(["E102", "E250", "E211"], "en", profile({ ageBand: "child" })) } };

export const French: Story = {
    args: { items: items(["E102", "E621", "E150d"], "fr", null) },
    parameters: { locale: "fr" },
};
