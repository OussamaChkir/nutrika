import {
    OFFProduct,
    parseAllergens,
    parseAdditives,
    hasLabel,
} from "./openfoodfacts";

// ============================================
// TYPES
// ============================================

export interface PositiveAspect {
    text: string;
    icon?: string;
}

export interface NegativeAspect {
    text: string;
    icon?: string;
}

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

// Controversial additives that should be flagged
const BAD_ADDITIVES: Record<string, string> = {
    "E102": "Tartrazine (artificial color)",
    "E104": "Quinoline Yellow",
    "E110": "Sunset Yellow (artificial color)",
    "E122": "Carmoisine (artificial color)",
    "E124": "Ponceau 4R (artificial color)",
    "E129": "Allura Red (artificial color)",
    "E133": "Brilliant Blue",
    "E150D": "Caramel color (4-MEI)",
    "E211": "Sodium benzoate (preservative)",
    "E250": "Sodium nitrite",
    "E320": "BHA (antioxidant)",
    "E321": "BHT (antioxidant)",
    "E621": "Monosodium glutamate (MSG)",
    "E951": "Aspartame",
    "E950": "Acesulfame K",
    "E955": "Sucralose",
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
            score -= 12;
            negatives.push({
                text: `Very high sugar (${sugars.toFixed(1)}g/100g)`,
                icon: "alert-triangle",
            });
        } else if (sugars > 10) {
            score -= 6;
            negatives.push({
                text: `High sugar (${sugars.toFixed(1)}g/100g)`,
                icon: "alert-circle",
            });
        } else if (sugars < 5) {
            score += 3;
            positives.push({
                text: `Low sugar (${sugars.toFixed(1)}g/100g)`,
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
            score -= 6;
            negatives.push({
                text: `High saturated fat (${saturatedFat.toFixed(1)}g/100g)`,
                icon: "alert-circle",
            });
        } else if (saturatedFat < 1.5) {
            score += 3;
            positives.push({
                text: `Low saturated fat (${saturatedFat.toFixed(1)}g/100g)`,
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
            score -= 6;
            negatives.push({
                text: `High salt (${salt.toFixed(1)}g/100g)`,
                icon: "alert-circle",
            });
        } else if (salt < 0.3) {
            score += 3;
            positives.push({
                text: `Low salt (${salt.toFixed(1)}g/100g)`,
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
            text: `Good fiber content (${fiber.toFixed(1)}g/100g)`,
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
            text: `High protein (${proteins.toFixed(1)}g/100g)`,
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
                text: "Ultra-processed food (NOVA 4)",
                icon: "factory",
            });
        } else if (novaGroup === 3) {
            score -= 5;
            negatives.push({
                text: "Processed food (NOVA 3)",
                icon: "package",
            });
        } else if (novaGroup === 1) {
            score += 8;
            positives.push({
                text: "Unprocessed or minimally processed (NOVA 1)",
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
        const code = additive.split("-")[0].trim();
        if (BAD_ADDITIVES[code]) {
            badAdditiveCount++;
            if (badAdditiveCount <= 3) {
                negatives.push({
                    text: BAD_ADDITIVES[code],
                    icon: "flask-conical",
                });
            }
        }
    });

    if (badAdditiveCount > 0) {
        score -= Math.min(badAdditiveCount * 4, 16);
    }

    if (additives.length === 0) {
        score += 5;
        positives.push({
            text: "No additives detected",
            icon: "sparkles",
        });
    }

    // ==========================================
    // LABELS ANALYSIS
    // ==========================================
    if (hasLabel(offData, "organic") || hasLabel(offData, "bio")) {
        score += 8;
        positives.push({
            text: "Organic certified",
            icon: "leaf",
        });
    }

    if (hasLabel(offData, "fair-trade")) {
        score += 3;
        positives.push({
            text: "Fair trade certified",
            icon: "heart-handshake",
        });
    }

    if (hasLabel(offData, "vegan")) {
        score += 3;
        positives.push({
            text: "Vegan",
            icon: "vegan",
        });
    }

    if (hasLabel(offData, "vegetarian")) {
        score += 2;
        positives.push({
            text: "Vegetarian",
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
    if (score >= 80) letter = "A";
    else if (score >= 65) letter = "B";
    else if (score >= 45) letter = "C";
    else if (score >= 25) letter = "D";
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