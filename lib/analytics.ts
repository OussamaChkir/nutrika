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
    /** Phase 1: a scan was completed. */
    scan_completed: { withProfile: boolean; offline?: boolean };
    /** Phase 2: ingredient explanation opened. */
    ingredient_explanation_opened: { kind: "additive" | "ingredient" };
    /** Phase 3: an alternative product was tapped. */
    alternative_tapped: { fromGrade: string };
    /** Phase 3: a shopping list was created. */
    list_created: NoProps;
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
