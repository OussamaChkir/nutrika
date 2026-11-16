import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { AlternativesList } from "@/components/alternatives-list";
import type { Alternative } from "@/lib/alternatives/rank";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const alt = (over: Partial<Alternative>): Alternative => ({
    barcode: "3017620422003",
    name: "Oat biscuits, no added sugar",
    brand: "Example Brand",
    imageUrl: null,
    score: 78,
    letter: "B",
    color: "#84cc16",
    delta: 31,
    deltaIsPersonal: false,
    personalScore: null,
    status: null,
    reason: { key: "lessSugar", params: { from: 32, to: 4, unit: "100 g" } },
    countriesTags: ["en:tunisia"],
    ...over,
});

const meta: Meta<typeof AlternativesList> = {
    title: "Product/AlternativesList",
    component: AlternativesList,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider
                locale={context.parameters.locale ?? "en"}
                messages={context.parameters.locale === "fr" ? fr : en}
            >
                <div className="w-[440px]">
                    <Story />
                </div>
            </NextIntlClientProvider>
        ),
    ],
};
export default meta;
type Story = StoryObj<typeof AlternativesList>;

const list: Alternative[] = [
    alt({}),
    alt({
        barcode: "2",
        name: "Salted crackers, low salt",
        letter: "B",
        score: 74,
        delta: 27,
        reason: { key: "lessSalt", params: { from: 2.4, to: 0.6 } },
    }),
    alt({
        barcode: "3",
        name: "Plain wholegrain cereal bar with a very long product name that must truncate",
        letter: "A",
        color: "#22c55e",
        score: 88,
        delta: 41,
        reason: { key: "fewerAdditives", params: { from: 5, to: 0 } },
        countriesTags: ["en:france"],
    }),
];

export const Anonymous: Story = {
    args: { alternatives: list, fromLetter: "D", profileName: null, countryTag: "en:tunisia" },
};

export const ForAProfile: Story = {
    args: {
        alternatives: list.map((a) => ({ ...a, deltaIsPersonal: true, personalScore: a.score, status: "good_match" as const })),
        fromLetter: "B",
        profileName: "Sami",
        countryTag: "en:tunisia",
    },
};

export const NothingBetterFound: Story = {
    args: { alternatives: [], fromLetter: "D", profileName: null, countryTag: null },
};

export const French: Story = {
    parameters: { locale: "fr" },
    args: { alternatives: list, fromLetter: "D", profileName: null, countryTag: "en:tunisia" },
};
