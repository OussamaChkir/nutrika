import {
    OFFProduct,
    parseAllergens,
    parseAdditives,
    hasLabel,
} from "./openfoodfacts";

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
    severity: "LOW" | "MEDIUM" | "HIGH";
}

export type ScoreLetter = "A" | "B" | "C" | "D" | "E";

export interface ScoreResult {
    score: number;
    letter: ScoreLetter;
    color: string;
    positives: PositiveAspect[];
    negatives: NegativeAspect[];
    allergens: AllergenInfo[];
    allergensSeverity: "LOW" | "MEDIUM" | "HIGH";
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

// High severity allergens
const HIGH_SEVERITY_ALLERGENS = [
    "peanuts",
    "tree nuts",
    "nuts",
    "shellfish",
    "fish",
];

const MEDIUM_SEVERITY_ALLERGENS = [
    "milk",
    "eggs",
    "wheat",
    "soy",
    "sesame",
];

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate a comprehensive score for a product
 */
export function calculateScore(offData: OFFProduct): ScoreResult {
    let score = 85; // Start with a higher neutral score
    const positives: PositiveAspect[] = [];
    const negatives: NegativeAspect[] = [];
    const nutriments = offData.nutriments || {};

    // ==========================================
    // SUGAR ANALYSIS
    // ==========================================
    const sugars = nutriments.sugars_100g;
    if (sugars !== undefined) {
        if (sugars > 22.5) {
            score -= 20;
            negatives.push({
                key: "veryHighSugar",
                params: { value: sugars.toFixed(1) },
                icon: "alert-triangle",
            });
        } else if (sugars > 10) {
            score -= 10;
            negatives.push({
                key: "highSugar",
                params: { value: sugars.toFixed(1) },
                icon: "alert-circle",
            });
        } else if (sugars < 5) {
            score += 3;
            positives.push({
                key: "lowSugar",
                params: { value: sugars.toFixed(1) },
                icon: "check-circle",
            });
        }
    }

    // ==========================================
    // FAT ANALYSIS
    // ==========================================
    const saturatedFat = nutriments["saturated-fat_100g"];
    if (saturatedFat !== undefined) {
        if (saturatedFat > 5) {
            score -= 10;
            negatives.push({
                key: "highSaturatedFat",
                params: { value: saturatedFat.toFixed(1) },
                icon: "alert-circle",
            });
        } else if (saturatedFat < 1.5) {
            score += 3;
            positives.push({
                key: "lowSaturatedFat",
                params: { value: saturatedFat.toFixed(1) },
                icon: "check-circle",
            });
        }
    }

    // ==========================================
    // SALT ANALYSIS
    // ==========================================
    const salt = nutriments.salt_100g;
    if (salt !== undefined) {
        if (salt > 1.5) {
            score -= 10;
            negatives.push({
                key: "highSalt",
                params: { value: salt.toFixed(1) },
                icon: "alert-circle",
            });
        } else if (salt < 0.3) {
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
    const fiber = nutriments.fiber_100g;
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
    const proteins = nutriments.proteins_100g;
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
    const novaGroup = offData.nova_group;
    if (novaGroup !== undefined) {
        if (novaGroup === 4) {
            score -= 10;
            negatives.push({
                key: "nova4",
                icon: "factory",
            });
        } else if (novaGroup === 3) {
            score -= 5;
            negatives.push({
                key: "nova3",
                icon: "package",
            });
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
    const additives = parseAdditives(offData);
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
    if (hasLabel(offData, "organic") || hasLabel(offData, "bio")) {
        score += 5;
        positives.push({
            key: "organicCertified",
            icon: "leaf",
        });
    }

    if (hasLabel(offData, "fair-trade")) {
        score += 3;
        positives.push({
            key: "fairTradeCertified",
            icon: "heart-handshake",
        });
    }

    if (hasLabel(offData, "vegan")) {
        score += 3;
        positives.push({
            key: "veganLabel",
            icon: "vegan",
        });
    }

    if (hasLabel(offData, "vegetarian")) {
        score += 2;
        positives.push({
            key: "vegetarianLabel",
            icon: "salad",
        });
    }

    // ==========================================
    // NUTRISCORE BLENDING (20% weight - reduced from 40%)
    // ==========================================
    const nutriscore = offData.nutriscore_grade?.toLowerCase();
    if (nutriscore) {
        const nutriscoreBonus: Record<string, number> = {
            a: 10,
            b: 5,
            c: 0,
            d: -5,
            e: -10,
        };
        const bonus = nutriscoreBonus[nutriscore] ?? 0;
        score = Math.round(score * 0.8 + (50 + bonus) * 0.2);
    }

    // ==========================================
    // ALLERGENS ANALYSIS
    // ==========================================
    const rawAllergens = parseAllergens(offData);
    const allergenInfos: AllergenInfo[] = rawAllergens.map((name) => {
        const lowerName = name.toLowerCase();
        let severity: "LOW" | "MEDIUM" | "HIGH" = "LOW";

        if (HIGH_SEVERITY_ALLERGENS.some((a) => lowerName.includes(a))) {
            severity = "HIGH";
        } else if (MEDIUM_SEVERITY_ALLERGENS.some((a) => lowerName.includes(a))) {
            severity = "MEDIUM";
        }

        return { name, severity };
    });

    // Determine overall allergen severity
    let allergensSeverity: "LOW" | "MEDIUM" | "HIGH" = "LOW";
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
    if (nutriments.carbohydrates_100g !== undefined && nutriments.carbohydrates_100g < 5) {
        dietaryTags.push("Keto friendly");
    }

    // Vegan
    if (hasLabel(offData, "vegan")) {
        dietaryTags.push("Vegan");
    }

    // Muscle gain: high protein
    if (nutriments.proteins_100g !== undefined && nutriments.proteins_100g > 15) {
        dietaryTags.push("Muscle gain");
    }

    // Diabetic safe: low sugar and moderate/low carbs
    if (
        nutriments.sugars_100g !== undefined &&
        nutriments.carbohydrates_100g !== undefined &&
        nutriments.sugars_100g < 5 &&
        nutriments.carbohydrates_100g < 15
    ) {
        dietaryTags.push("Diabetic safe");
    }

    // Palm oil
    if (offData.ingredients_analysis_tags?.includes("en:palm-oil-free")) {
        dietaryTags.push("Palm oil free");
    } else if (offData.ingredients_analysis_tags?.includes("en:palm-oil") ||
               offData.ingredients_text?.toLowerCase().includes("palm") ||
               offData.ingredients_text?.toLowerCase().includes("palme")) {
        dietaryTags.push("Contains palm oil");
    }

    return {
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
 * Get display text for allergen severity
 */
export function getAllergenSeverityText(
    severity: "LOW" | "MEDIUM" | "HIGH"
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
    severity: "LOW" | "MEDIUM" | "HIGH"
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