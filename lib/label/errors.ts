// F5: every error code the screen can show. The route returns these, the screen maps each one
// to a message under Label.errors (a test checks both languages have all of them).

export const LABEL_ERROR_CODES = [
    "busy", "config", "blocked", "bad_output", "network", "timeout", "too_large", "bad_type", "bad_request",
    "user_limit", "global_limit", "region", "unknown_region", "not_configured", "consent_required",
    "unauthorized", "disabled", "unreadable_file", "generic",
] as const;

export type LabelErrorCode = (typeof LABEL_ERROR_CODES)[number];

export const isLabelErrorCode = (value: unknown): value is LabelErrorCode =>
    typeof value === "string" && (LABEL_ERROR_CODES as readonly string[]).includes(value);
