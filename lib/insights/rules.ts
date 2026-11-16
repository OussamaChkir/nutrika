// F9: numbers that decide what is recorded and what is shown. Pure, no I/O.
//
// PRODUCT DECISIONS (first proposal, change the constants).
//
// Wording rule (from the roadmap): scanned does not mean eaten. Insights talk about "the
// products you scanned", never about intake, and make no medical claim.

/** No insight is shown before this many scans. */
export const MIN_SCANS = 10;
/** Scans of the same product within this window count once (page refreshes, double taps). */
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
/** Records older than this are deleted. Stated on the Privacy page. */
export const RETENTION_DAYS = 365;
/** Insights look at this many days of scans. */
export const ANALYSIS_DAYS = 90;
/** "This month" counts. */
export const RECENT_DAYS = 30;
/** Safety cap on rows read for one insights page. */
export const MAX_EVENTS_READ = 1000;

/** Score change (points) between the older and the newer half that counts as a trend. */
export const TREND_MIN_DELTA = 5;
/** High-sugar count is shown from this many scans in the last RECENT_DAYS. */
export const HIGH_SUGAR_MIN_COUNT = 3;
/** Protein per 100 g from which a product counts as "high protein". */
export const HIGH_PROTEIN_G = 10;
/** Share of scans that must be high-protein for the "habit" insight. */
export const PROTEIN_HABIT_SHARE = 0.6;
/** Salt, protein and NOVA insights need this many scans where the value is known. */
export const MIN_KNOWN_VALUES = 5;
/** A category needs this many scans to be compared. */
export const MIN_CATEGORY_SCANS = 3;
/** Best and worst category are shown only if their averages differ by at least this. */
export const CATEGORY_MIN_GAP = 10;
/** Most-scanned brand: at least this many scans and this share of all scans. */
export const BRAND_MIN_COUNT = 4;
export const BRAND_MIN_SHARE = 0.2;
/** Ultra-processed share at or above this is flagged as a notice. */
export const ULTRA_PROCESSED_NOTICE_SHARE = 0.5;
/** Weeks drawn on the score chart. */
export const CHART_WEEKS = 12;

export const DAY_MS = 24 * 60 * 60 * 1000;
