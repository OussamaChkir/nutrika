import type { Prisma } from "@prisma/client";
import type { ScoreAspect } from "./scoring";

export type ScoreMessageTranslator = (
    key: string,
    values?: Record<string, string | number>
) => string;

/** Maps legacy English additive names (stored in DB) to translation keys */
export const ADDITIVE_MESSAGE_KEYS: Record<string, string> = {
    "Tartrazine (artificial color)": "additiveE102",
    "Quinoline Yellow": "additiveE104",
    "Sunset Yellow (artificial color)": "additiveE110",
    "Carmoisine (artificial color)": "additiveE122",
    "Ponceau 4R (artificial color)": "additiveE124",
    "Allura Red (artificial color)": "additiveE129",
    "Brilliant Blue": "additiveE133",
    "Caramel color (4-MEI)": "additiveE150D",
    "Sodium benzoate (preservative)": "additiveE211",
    "Sodium nitrite": "additiveE250",
    "BHA (antioxidant)": "additiveE320",
    "BHT (antioxidant)": "additiveE321",
    "Monosodium glutamate (MSG)": "additiveE621",
    Aspartame: "additiveE951",
    "Acesulfame K": "additiveE950",
    Sucralose: "additiveE955",
};

const LEGACY_EXACT: Record<string, string> = {
    "Ultra-processed food (NOVA 4)": "nova4",
    "Processed food (NOVA 3)": "nova3",
    "Unprocessed or minimally processed (NOVA 1)": "nova1",
    "No additives detected": "noAdditives",
    "Organic certified": "organicCertified",
    "Fair trade certified": "fairTradeCertified",
    Vegan: "veganLabel",
    Vegetarian: "vegetarianLabel",
    ...ADDITIVE_MESSAGE_KEYS,
};

const LEGACY_PATTERNS: {
    regex: RegExp;
    key: string;
    paramNames: string[];
}[] = [
    { regex: /^Very high sugar \(([\d.]+)g\/100g\)$/, key: "veryHighSugar", paramNames: ["value"] },
    { regex: /^High sugar \(([\d.]+)g\/100g\)$/, key: "highSugar", paramNames: ["value"] },
    { regex: /^Low sugar \(([\d.]+)g\/100g\)$/, key: "lowSugar", paramNames: ["value"] },
    { regex: /^High saturated fat \(([\d.]+)g\/100g\)$/, key: "highSaturatedFat", paramNames: ["value"] },
    { regex: /^Low saturated fat \(([\d.]+)g\/100g\)$/, key: "lowSaturatedFat", paramNames: ["value"] },
    { regex: /^High salt \(([\d.]+)g\/100g\)$/, key: "highSalt", paramNames: ["value"] },
    { regex: /^Low salt \(([\d.]+)g\/100g\)$/, key: "lowSalt", paramNames: ["value"] },
    { regex: /^Good fiber content \(([\d.]+)g\/100g\)$/, key: "goodFiber", paramNames: ["value"] },
    { regex: /^High protein \(([\d.]+)g\/100g\)$/, key: "highProtein", paramNames: ["value"] },
];

function resolveLegacyKey(text: string): { key: string; params?: Record<string, string | number> } | null {
    const exact = LEGACY_EXACT[text];
    if (exact) return { key: exact };

    for (const { regex, key, paramNames } of LEGACY_PATTERNS) {
        const match = text.match(regex);
        if (match) {
            const params: Record<string, string | number> = {};
            paramNames.forEach((name, i) => {
                params[name] = match[i + 1];
            });
            return { key, params };
        }
    }
    return null;
}

function isScoreAspect(value: unknown): value is ScoreAspect {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return typeof item.key === "string" || typeof item.text === "string";
}

/** Parse positives/negatives JSON from Prisma into typed score aspects. */
export function parseScoreAspects(value: Prisma.JsonValue | null | undefined): ScoreAspect[] {
    if (!value || !Array.isArray(value)) return [];
    return value.filter(isScoreAspect).map((item) => ({
        key: typeof item.key === "string" ? item.key : undefined,
        params:
            item.params && typeof item.params === "object" && !Array.isArray(item.params)
                ? (item.params as Record<string, string | number>)
                : undefined,
        text: typeof item.text === "string" ? item.text : undefined,
        icon: typeof item.icon === "string" ? item.icon : undefined,
    }));
}

/** Resolve a score aspect to localized text (supports new keys and legacy English text in DB). */
export function resolveScoreAspectMessage(
    aspect: ScoreAspect,
    t: ScoreMessageTranslator
): string {
    if (aspect.key) {
        try {
            return t(aspect.key, aspect.params);
        } catch {
            return aspect.text ?? aspect.key;
        }
    }

    if (aspect.text) {
        const legacy = resolveLegacyKey(aspect.text);
        if (legacy) {
            try {
                return t(legacy.key, legacy.params);
            } catch {
                return aspect.text;
            }
        }
        return aspect.text;
    }

    return "";
}
