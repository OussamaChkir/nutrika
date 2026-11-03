// F3: share the list as plain text (WhatsApp, SMS). Pure; nothing is sent by the app itself,
// the user's own messaging app opens with the text ready.

import type { ListItem } from "./list";

export interface ShareLabels {
    title: string;
    /** Footer line, e.g. the site name. */
    footer?: string;
}

/** Items still to buy, one per line ("2 x Milk"). Bought items are left out. Null when nothing is left. */
export function buildShareText(items: readonly ListItem[], labels: ShareLabels): string | null {
    const todo = items.filter((i) => !i.checked);
    if (todo.length === 0) return null;
    const lines = todo.map((i) => (i.quantity > 1 ? `${i.quantity} x ${i.label}` : i.label));
    return [labels.title, "", ...lines.map((l) => `- ${l}`), ...(labels.footer ? ["", labels.footer] : [])].join("\n");
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
/** The "?&body=" form works on both iOS and Android. */
export const smsUrl = (text: string) => `sms:?&body=${encodeURIComponent(text)}`;
