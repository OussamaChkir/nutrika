import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Badge> = {
    title: "UI/Badge",
    component: Badge,
    tags: ["autodocs"],
    argTypes: {
        variant: {
            control: "select",
            options: ["default", "secondary", "destructive", "outline", "warning", "success"],
        },
    },
    parameters: {
        layout: "centered",
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {
        children: "Default Badge",
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

export const Warning: Story = {
    args: {
        children: "Warning",
        variant: "warning",
    },
};

export const Success: Story = {
    args: {
        children: "Success",
        variant: "success",
    },
};
