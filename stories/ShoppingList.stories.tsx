import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import { SavedProducts } from "@/components/saved-products";
import { ScanFlags } from "@/components/scan-flags";
import { ProductSaveActionsBar } from "@/components/product-save-actions";
import { ShoppingList } from "@/components/shopping-list";
import type { ListItem } from "@/lib/shopping/list";
import type { ShoppingListActions, ProductSaveActions } from "@/lib/shopping/types";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

// Stub actions: the stories never touch the database or the server.
const okList: ShoppingListActions = {
    add: async ({ label, quantity }) => ({
        ok: true,
        firstItem: false,
        item: { id: `new-${label}`, barcode: null, label, category: null, quantity: quantity ?? 1, checked: false, createdAt: Date.now() },
    }),
    setQuantity: async () => ({ ok: true }),
    setChecked: async () => ({ ok: true }),
    remove: async () => ({ ok: true }),
    clearChecked: async () => ({ ok: true }),
};
const failingList: ShoppingListActions = {
    ...okList,
    setChecked: async () => ({ ok: false, error: "failed" }),
    add: async () => ({ ok: false, error: "limit" }),
};
const okSave: ProductSaveActions = {
    setState: async (_barcode, requested) => ({ ok: true, state: requested }),
    addToList: async () => ({ ok: true, firstItem: false }),
};

const item = (over: Partial<ListItem>): ListItem => ({ id: "1", barcode: null, label: "Bread", category: null, quantity: 1, checked: false, createdAt: 1, ...over });
const items: ListItem[] = [
    item({ id: "1", label: "Whole milk 1 L", barcode: "6191234567890", category: "en:milks", quantity: 2, createdAt: 1 }),
    item({ id: "2", label: "Bread", createdAt: 2 }),
    item({ id: "3", label: "Cola zero", barcode: "5449000000996", category: "en:colas", createdAt: 3 }),
    item({ id: "4", label: "حليب", createdAt: 4 }),
    item({ id: "5", label: "Eggs", category: "en:eggs", checked: true, createdAt: 5 }),
];

const meta: Meta<typeof ShoppingList> = {
    title: "Shopping/ShoppingList",
    component: ShoppingList,
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
type Story = StoryObj<typeof ShoppingList>;

export const WithItems: Story = { args: { initialItems: items, actions: okList } };
export const Empty: Story = { args: { initialItems: [], actions: okList } };
export const AllBought: Story = { args: { initialItems: items.map((i) => ({ ...i, checked: true })), actions: okList } };
/** Checking an item fails on the server: the tick is undone and a message appears. */
export const ServerRefuses: Story = { args: { initialItems: items, actions: failingList } };
export const French: Story = { parameters: { locale: "fr" }, args: { initialItems: items, actions: okList } };

export const Flags: StoryObj<typeof ScanFlags> = {
    render: () => (
        <ScanFlags
            flags={[
                { kind: "avoid", severity: "warning" },
                { kind: "moreSugar", severity: "caution", params: { current: 52, usual: 21 } },
                { kind: "approved", severity: "positive" },
                { kind: "approvedButCheck", severity: "warning" },
            ]}
        />
    ),
};

export const SaveActions: StoryObj<typeof ProductSaveActionsBar> = {
    render: () => <ProductSaveActionsBar barcode="3017620422003" signedIn initialState={null} initialOnList={false} actions={okSave} />,
};
export const SaveActionsApproved: StoryObj<typeof ProductSaveActionsBar> = {
    render: () => <ProductSaveActionsBar barcode="3017620422003" signedIn initialState="approved" initialOnList actions={okSave} />,
};
export const SaveActionsSignedOut: StoryObj<typeof ProductSaveActionsBar> = {
    render: () => <ProductSaveActionsBar barcode="3017620422003" signedIn={false} initialState={null} initialOnList={false} actions={okSave} />,
};

export const Saved: StoryObj<typeof SavedProducts> = {
    render: () => (
        <SavedProducts
            onClear={async () => ({ ok: true })}
            products={[
                { barcode: "1", name: "Oat biscuits", brand: "Example", score: 78, scoreLetter: "B", state: "approved" },
                { barcode: "2", name: "Chocolate spread", brand: "Example", score: 31, scoreLetter: "D", state: "avoid" },
            ]}
        />
    ),
};
