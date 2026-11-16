import type { OFFProduct } from "./openfoodfacts";
import {
    getAllergenSeverity,
    type AllergenSeverity,
} from "./allergens";
import { normalizeOffProduct, type Product } from "./product";
import {
    CATEGORY_RULES,
    getProductCategory,
    type ProductCategory,
} from "./scoring-rules";

// NOTE: this module is pure (no I/O, no React, no server-only imports) so the same
// scoring runs on the server, in the browser and offline. Do not import
// ./openfoodfacts at runtime from here (it pulls in React's server `cache`).

// ============================================
// TYPES
// ============================================

export interface ScoreAspect {
    /** i18n key under ScoreMessages namespace */
    key?: string;
    params?: Record<string, string | number>;
    /** Legacy English text from older DB records */
    text?: string;
    icon?: string;
}

export type PositiveAspect = ScoreAspect;
export type NegativeAspect = ScoreAspect;

export interface AllergenInfo {
    name: string;
    severity: AllergenSeverity;
}

export type ScoreLetter = "A" | "B" | "C" | "D" | "E";

export interface ScoreResult {
    /** Scoring category the product was judged in (drives thresholds). */
    category: ProductCategory;
    score: number;
    letter: ScoreLetter;
    color: string;
    positives: PositiveAspect[];
    negatives: NegativeAspect[];
    allergens: AllergenInfo[];
    allergensSeverity: AllergenSeverity;
    dietaryTags: string[];
}

// ============================================
// CONSTANTS
// ============================================

// Colors for each grade
const GRADE_COLORS: Record<ScoreLetter, string> = {
    A: "#22c55e", // Green
    B: "#84cc16", // Lime
    C: "#f97316", // Orange
    D: "#ef4444", // Red
    E: "#991b1b", // Dark red
};

// Controversial additives: E-code -> ScoreMessages translation key
const BAD_ADDITIVES: Record<string, string> = {
    E102: "additiveE102",
    E104: "additiveE104",
    E110: "additiveE110",
    E122: "additiveE122",
    E124: "additiveE124",
    E129: "additiveE129",
    E133: "additiveE133",
    E150D: "additiveE150D",
    E211: "additiveE211",
    E250: "additiveE250",
    E320: "additiveE320",
    E321: "additiveE321",
    E621: "additiveE621",
    E951: "additiveE951",
    E950: "additiveE950",
    E955: "additiveE955",
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score a normalized product. Pure: same input, same output, no I/O.
 */
export function scoreProduct(product: Product): ScoreResult {
    let score = 75; // Start with a higher neutral score
    const positives: PositiveAspect[] = [];
    const negatives: NegativeAspect[] = [];
    const n = product.nutrients;

    const category = getProductCategory(product.categoryTags);
    const rules = CATEGORY_RULES[category];
    const drink = rules.sugarUnit === "100ml" ? "Drink" : "";

    // ==========================================
    // SUGAR ANALYSIS
    // ==========================================
    const sugars = n.sugars;
    if (sugars !== undefined) {
        if (sugars > rules.sugar.veryHigh) {
            score -= 20;
            negatives.push({
                key: `veryHighSugar${drink}`,
                params: { value: sugars.toFixed(1) },
                icon: "alert-triangle",
            });
        } else if (sugars > rules.sugar.high) {
            score -= 10;
            negatives.push({
                key: `highSugar${drink}`,
                params: { value: sugars.toFixed(1) },
                icon: "alert-circle",
            });
        } else if (sugars < rules.sugar.low) {
            score += 3;
            positives.push({
                key: `lowSugar${drink}`,
                params: { value: sugars.toFixed(1) },
                icon: "check-circle",
            });
        }
    }

    // ==========================================
    // FAT ANALYSIS
    // ==========================================
    const saturatedFat = n.saturatedFat;
    const satRules = rules.saturatedFat;
    if (saturatedFat !== undefined) {
        if (satRules.kind === "absolute") {
            if (saturatedFat > satRules.high) {
                score -= 10;
                negatives.push({
                    key: "highSaturatedFat",
                    params: { value: saturatedFat.toFixed(1) },
                    icon: "alert-circle",
                });
            } else if (saturatedFat < satRules.low) {
                score += 3;
                positives.push({
                    key: "lowSaturatedFat",
                    params: { value: saturatedFat.toFixed(1) },
                    icon: "check-circle",
                });
            }
        } else if (n.fat !== undefined && n.fat > 0) {
            // Fats and oils: judge the share of saturated fat, not the absolute amount.
            const share = saturatedFat / n.fat;
            if (share > satRules.highShare) {
                score -= satRules.penalty;
                negatives.push({
                    key: "highSaturatedFatShare",
                    params: {
                        value: saturatedFat.toFixed(1),
                        share: Math.round(share * 100),
                    },
                    icon: "alert-circle",
                });
            }
        }
    }

    // ==========================================
    // SALT ANALYSIS
    // ==========================================
    const salt = n.salt;
    if (salt !== undefined) {
        if (salt > rules.salt.high) {
            score -= 10;
            negatives.push({
                key: "highSalt",
                params: { value: salt.toFixed(1) },
                icon: "alert-circle",
            });
        } else if (salt < rules.salt.low) {
            score += 3;
            positives.push({
                key: "lowSalt",
                params: { value: salt.toFixed(1) },
                icon: "check-circle",
            });
        }
    }

    // ==========================================
    // FIBER ANALYSIS
    // ==========================================
    const fiber = n.fiber;
    if (fiber !== undefined && fiber > 3) {
        score += 8;
        positives.push({
            key: "goodFiber",
            params: { value: fiber.toFixed(1) },
            icon: "check-circle",
        });
    }

    // ==========================================
    // PROTEIN ANALYSIS
    // ==========================================
    const proteins = n.proteins;
    if (proteins !== undefined && proteins > 10) {
        score += 8;
        positives.push({
            key: "highProtein",
            params: { value: proteins.toFixed(1) },
            icon: "check-circle",
        });
    }

    // ==========================================
    // NOVA GROUP (Processing level)
    // ==========================================
    const novaGroup = product.novaGroup;
    if (novaGroup !== undefined) {
        if (novaGroup === 4) {
            score -= 10;
            negatives.push({
                key: "nova4",
                icon: "factory",
            });
        } else if (novaGroup === 3) {
            if (rules.nova3Penalty > 0) {
                score -= rules.nova3Penalty;
                negatives.push({
                    key: "nova3",
                    icon: "package",
                });
            }
        } else if (novaGroup === 1) {
            score += 8;
            positives.push({
                key: "nova1",
                icon: "leaf",
            });
        }
    }

    // ==========================================
    // ADDITIVES ANALYSIS
    // ==========================================
    const additives = product.additives;
    let badAdditiveCount = 0;

    additives.forEach((additive) => {
        const code = additive.split("-")[0].trim().toUpperCase();
        if (BAD_ADDITIVES[code]) {
            badAdditiveCount++;
            if (badAdditiveCount <= 3) {
                negatives.push({
                    key: BAD_ADDITIVES[code],
                    icon: "flask-conical",
                });
            }
        }
    });

    if (badAdditiveCount > 0) {
        score -= Math.min(badAdditiveCount * 6, 20);
    }

    if (additives.length === 0) {
        score += 5;
        positives.push({
            key: "noAdditives",
            icon: "sparkles",
        });
    }

    // ==========================================
    // LABELS ANALYSIS
    // ==========================================
    if (product.labels.organic) {
        score += 5;
        positives.push({
            key: "organicCertified",
            icon: "leaf",
        });
    }

    if (product.labels.fairTrade) {
        score += 3;
        positives.push({
            key: "fairTradeCertified",
            icon: "heart-handshake",
        });
    }

    if (product.labels.vegan) {
        score += 3;
        positives.push({
            key: "veganLabel",
            icon: "vegan",
        });
    }

    if (product.labels.vegetarian) {
        score += 2;
        positives.push({
            key: "vegetarianLabel",
            icon: "salad",
        });
    }

    // ==========================================
    // NUTRISCORE BLENDING (20% weight - reduced from 40%)
    // ==========================================
    if (product.nutriscoreGrade) {
        const nutriscoreBonus: Record<string, number> = {
            a: 10,
            b: 5,
            c: 0,
            d: -5,
            e: -10,
        };
        const bonus = nutriscoreBonus[product.nutriscoreGrade];
        score = Math.round(score * 0.8 + (50 + bonus) * 0.2);
    }

    // ==========================================
    // ALLERGENS ANALYSIS
    // ==========================================
    const allergenNames = Array.from(
        new Set([...product.allergens, ...product.traces.map((t) => `may contain ${t}`)])
    );
    const allergenInfos: AllergenInfo[] = allergenNames.map((name) => ({
        name,
        severity: getAllergenSeverity(name),
    }));

    // Determine overall allergen severity
    let allergensSeverity: AllergenSeverity = "LOW";
    if (allergenInfos.some((a) => a.severity === "HIGH")) {
        allergensSeverity = "HIGH";
    } else if (allergenInfos.some((a) => a.severity === "MEDIUM")) {
        allergensSeverity = "MEDIUM";
    }

    // ==========================================
    // FINAL SCORE NORMALIZATION
    // ==========================================
    score = Math.max(0, Math.min(100, score));

    // Determine letter grade
    let letter: ScoreLetter;
    if (score >= 85) letter = "A";
    else if (score >= 70) letter = "B";
    else if (score >= 50) letter = "C";
    else if (score >= 30) letter = "D";
    else letter = "E";

    // ==========================================
    // DIETARY TAGS CALCULATION
    // ==========================================
    const dietaryTags: string[] = [];

    // Keto friendly: low carbs
    if (n.carbohydrates !== undefined && n.carbohydrates < 5) {
        dietaryTags.push("Keto friendly");
    }

    // Vegan
    if (product.labels.vegan) {
        dietaryTags.push("Vegan");
    }

    // Muscle gain: high protein
    if (n.proteins !== undefined && n.proteins > 15) {
        dietaryTags.push("Muscle gain");
    }

    // Diabetic safe: low sugar and moderate/low carbs
    if (
        n.sugars !== undefined &&
        n.carbohydrates !== undefined &&
        n.sugars < 5 &&
        n.carbohydrates < 15
    ) {
        dietaryTags.push("Diabetic safe");
    }

    // Palm oil
    const ingredients = product.ingredientsText?.toLowerCase();
    if (product.ingredientsAnalysisTags.includes("en:palm-oil-free")) {
        dietaryTags.push("Palm oil free");
    } else if (
        product.ingredientsAnalysisTags.includes("en:palm-oil") ||
        ingredients?.includes("palm") ||
        ingredients?.includes("palme")
    ) {
        dietaryTags.push("Contains palm oil");
    }

    return {
        category,
        score,
        letter,
        color: GRADE_COLORS[letter],
        positives,
        negatives,
        allergens: allergenInfos,
        allergensSeverity,
        dietaryTags,
    };
}

/**
 * Score a raw Open Food Facts product.
 * Thin wrapper kept so existing callers keep working: normalizes, then `scoreProduct`.
 */
export function calculateScore(offData: OFFProduct): ScoreResult {
    return scoreProduct(normalizeOffProduct(offData));
}

/**
 * Get display text for allergen severity
 */
export function getAllergenSeverityText(
    severity: AllergenSeverity
): string {
    switch (severity) {
        case "HIGH":
            return "Contains major allergens";
        case "MEDIUM":
            return "Contains common allergens";
        case "LOW":
            return "Low allergen risk";
    }
}

/**
 * Get color for allergen severity
 */
export function getAllergenSeverityColor(
    severity: AllergenSeverity
): string {
    switch (severity) {
        case "HIGH":
            return "#dc2626"; // Red
        case "MEDIUM":
            return "#f59e0b"; // Amber
        case "LOW":
            return "#22c55e"; // Green
    }
}