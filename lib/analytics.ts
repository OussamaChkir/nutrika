// Lightweight analytics helper on top of Vercel Analytics custom events.
//
// One typed entry point, `trackEvent`, so event names and properties stay consistent
// and match the metrics in the Notion roadmap. Rules:
//   - NEVER send health data (allergies, weight, height, date of birth, conditions)
//     or anything that identifies a person. Only counts and coarse flags.
//   - Analytics must never break the app: every failure is swallowed.
//   - Custom events need a Vercel plan that includes them; without it, calls are dropped.

import { track } from "@vercel/analytics";

/** Events that carry no properties. */
type NoProps = Record<never, never>;

/** Allowed events and their properties. Add new events here, not at call sites. */
export interface AnalyticsEvents {
    /** Phase 1: a signed-in user saved a health profile. */
    profile_created: NoProps;
    /** Phase 1: the "Score for you" card was shown (status only, never health details). */
    personal_score_viewed: { status: string };
    /** Phase 1 (F4): the user switched the active profile. */
    profile_switched: NoProps;
    /** Phase 1 (F4): the "check for everyone" table was opened. */
    everyone_view_opened: { profiles: number };
    /** Phase 1: a scan was completed. */
    scan_completed: { withProfile: boolean; offline?: boolean };
    /** Phase 2: ingredient explanation opened. */
    ingredient_explanation_opened: { kind: "additive" | "ingredient"; code?: string; hasInfo?: boolean };
    /** Phase 3 (F2): the alternatives block was shown (counts and a flag only). */
    alternatives_opened: { count: number; personal: boolean };
    /** Phase 3: an alternative product was tapped. */
    alternative_tapped: { fromGrade: string };
    /** Phase 3: a shopping list was created (the first item was added). */
    list_created: NoProps;
    /** Phase 3 (F3): an item was added to the list, from a scan result or from the list page. */
    list_item_added: { source: "scan" | "list" };
    /** Phase 3 (F3): a product was marked approved or avoid, or the mark was removed. */
    product_state_set: { state: "approved" | "avoid" | "cleared" };
    /** Phase 3 (F3): a flag was shown on a scan result (the kind only, never the product). */
    flag_shown: { kind: string };
    /** Phase 3 (F3): the list was opened in WhatsApp or SMS. */
    list_shared: { channel: "whatsapp" | "sms" };
    /** Phase 4 (F9): the insights page was viewed (counts only). */
    insights_viewed: { scans: number; insights: number };
    /** Phase 4 (F9): the user turned scan insights on or off. */
    insights_toggled: { enabled: boolean };
    /** Phase 5: a photo scan ended in a result the user accepted. */
    photo_scan_accepted: NoProps;
    /** Phase 6: a menu scan was done. */
    menu_scanned: NoProps;
}

export type AnalyticsEventName = keyof AnalyticsEvents;

type Primitive = string | number | boolean | null;

/** Property names that must never be sent, whatever the type says. */
const FORBIDDEN_KEYS = new Set([
    "allergies",
    "allergy",
    "weight",
    "height",
    "dateofbirth",
    "dob",
    "age",
    "condition",
    "conditions",
    "email",
    "name",
    "userid",
]);

const MAX_STRING_LENGTH = 255; // Vercel Analytics limit

/** Keep only primitives, drop forbidden keys and undefined values, truncate long strings. */
export function sanitizeProperties(props: Record<string, unknown> | undefined): Record<string, Primitive> {
    const clean: Record<string, Primitive> = {};
    if (!props) return clean;
    for (const [key, value] of Object.entries(props)) {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
        if (value === undefined) continue;
        if (typeof value === "string") {
            clean[key] = value.slice(0, MAX_STRING_LENGTH);
        } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
            clean[key] = value;
        }
    }
    return clean;
}

/** Send a custom analytics event. Safe to call anywhere on the client; never throws. */
export function trackEvent<E extends AnalyticsEventName>(
    name: E,
    ...args: keyof AnalyticsEvents[E] extends never ? [] : [props: AnalyticsEvents[E]]
): void {
    try {
        const props = sanitizeProperties(args[0] as Record<string, unknown> | undefined);
        track(name, Object.keys(props).length > 0 ? props : undefined);
    } catch {
        // Analytics must never break the app.
    }
}
