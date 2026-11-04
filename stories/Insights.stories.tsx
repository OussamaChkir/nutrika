import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { InsightsControls } from "@/components/insights-controls";
import { InsightsView } from "@/components/insights-view";
import { buildInsights, type TimedScan } from "@/lib/insights/generators";
import { DAY_MS } from "@/lib/insights/rules";
import type { InsightsActions } from "@/lib/insights/types";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const NOW = Date.UTC(2026, 10, 4, 12);

// Built with the real generators, so the story cannot drift from the app.
const scans = (count: number, days: number): TimedScan[] =>
    Array.from({ length: count }, (_, i) => ({
        barcode: `${100000 + i}`,
        score: 45 + Math.round((i / Math.max(1, count - 1)) * 35),
        grade: "C",
        sugar100: i % 3 === 0 ? 24 : 4,
        salt100: 1.1,
        satFat100: 3,
        protein100: i % 5 === 0 ? 3 : 14,
        nova: i % 2 === 0 ? 4 : 3,
        category: i % 2 === 0 ? "en:colas" : "en:cheeses",
        brand: i % 4 === 0 ? "Acme" : `Brand ${i}`,
        highSugar: i % 3 === 0,
        profileId: null,
        createdAt: NOW - (days - (i * days) / count) * DAY_MS,
    }));

const actions: InsightsActions = { setEnabled: async () => ({ ok: true }), deleteAll: async () => ({ ok: true }) };

const meta: Meta<typeof InsightsView> = {
    title: "Insights/InsightsView",
    component: InsightsView,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider locale={context.parameters.locale ?? "en"} messages={context.parameters.locale === "fr" ? fr : en}>
                <div className="w-[460px]"><Story /></div>
            </NextIntlClientProvider>
        ),
    ],
};
export default meta;
type Story = StoryObj<typeof InsightsView>;

/** 40 scans over 30 days. */
export const ActiveUser: Story = { args: { result: buildInsights(scans(40, 30), NOW), profileName: null } };
export const ForAProfile: Story = { args: { result: buildInsights(scans(40, 30), NOW), profileName: "Sami" } };
/** A new user: an encouraging progress bar, never fake insights. */
export const NewUser: Story = { args: { result: buildInsights(scans(3, 4), NOW), profileName: null } };
export const NoClearPattern: Story = {
    args: { result: buildInsights(scans(12, 20).map((s) => ({ ...s, score: 60, highSugar: false, salt100: null, protein100: null, nova: null, category: null, brand: null })), NOW), profileName: null },
};
export const French: Story = { parameters: { locale: "fr" }, args: { result: buildInsights(scans(40, 30), NOW), profileName: null } };

export const OptIn: StoryObj<typeof InsightsControls> = { render: () => <InsightsControls enabled={false} recordsCount={0} actions={actions} /> };
export const Controls: StoryObj<typeof InsightsControls> = { render: () => <InsightsControls enabled recordsCount={128} actions={actions} /> };
