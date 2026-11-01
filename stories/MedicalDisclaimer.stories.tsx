import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const meta: Meta<typeof MedicalDisclaimer> = {
    title: "Health/MedicalDisclaimer",
    component: MedicalDisclaimer,
    tags: ["autodocs"],
    argTypes: {
        variant: { control: "select", options: ["banner", "inline"] },
    },
    parameters: { layout: "centered" },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider
                locale={context.parameters.locale ?? "en"}
                messages={context.parameters.locale === "fr" ? fr : en}
            >
                <div className="w-[360px]">
                    <Story />
                </div>
            </NextIntlClientProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof MedicalDisclaimer>;

export const Banner: Story = { args: { variant: "banner" } };

export const Inline: Story = { args: { variant: "inline" } };

export const French: Story = {
    args: { variant: "banner" },
    parameters: { locale: "fr" },
};
