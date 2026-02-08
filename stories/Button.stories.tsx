import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";

const meta: Meta<typeof Button> = {
    title: "UI/Button",
    component: Button,
    tags: ["autodocs"],
    argTypes: {
        variant: {
            control: "select",
            options: [
                "default",
                "destructive",
                "outline",
                "secondary",
                "ghost",
                "link",
            ],
        },
        size: {
            control: "select",
            options: ["default", "sm", "lg", "icon"],
        },
        disabled: { control: "boolean" },
    },
    parameters: {
        layout: "centered",
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: "Button",
        variant: "default",
    },
};

export const Secondary: Story = {
    args: {
        children: "Secondary",
        variant: "secondary",
    },
};

export const Destructive: Story = {
    args: {
        children: "Destructive",
        variant: "destructive",
    },
};

export const Outline: Story = {
    args: {
        children: "Outline",
        variant: "outline",
    },
};

export const Ghost: Story = {
    args: {
        children: "Ghost",
        variant: "ghost",
    },
};

export const Link: Story = {
    args: {
        children: "Link",
        variant: "link",
    },
};

export const WithIcon: Story = {
    render: (args) => (
        <Button {...args}>
            <Mail className="mr-2 h-4 w-4" /> Login with Email
        </Button>
    ),
};

export const Loading: Story = {
    render: (args) => (
        <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Please wait
        </Button>
    ),
};
