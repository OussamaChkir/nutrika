import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { AccountDataCard } from "@/components/account-data-card";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const meta: Meta<typeof AccountDataCard> = {
    title: "Account/AccountDataCard",
    component: AccountDataCard,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    args: {
        email: "sara@example.com",
        canDelete: true,
        onDelete: async () => ({ ok: false, error: "failed" }),
    },
    decorators: [
        (Story, context) => (
            <NextIntlClientProvider
                locale={context.parameters.locale ?? "en"}
                messages={context.parameters.locale === "fr" ? fr : en}
            >
                <div className="w-[380px]">
                    <Story />
                </div>
            </NextIntlClientProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AccountDataCard>;

/** Click "Delete my account": the confirm button stays disabled until the email matches. */
export const Default: Story = {};

/** The server refuses (here: a failure): the message is announced as an alert. */
export const ServerRefuses: Story = { args: { onDelete: async () => ({ ok: false, error: "email_mismatch" }) } };

/** Admins see a note instead of the delete button. */
export const AdminCannotDelete: Story = { args: { canDelete: false } };

export const French: Story = { parameters: { locale: "fr" } };
