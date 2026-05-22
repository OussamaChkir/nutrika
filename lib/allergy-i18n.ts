import { ALLERGY_OPTIONS } from "@/lib/validators";

export const ALLERGY_I18N_KEYS: Record<(typeof ALLERGY_OPTIONS)[number], string> = {
    Gluten: "allergyGluten",
    Lactose: "allergyLactose",
    Milk: "allergyMilk",
    Eggs: "allergyEggs",
    Peanuts: "allergyPeanuts",
    "Tree Nuts": "allergyTreeNuts",
    Soy: "allergySoy",
    Fish: "allergyFish",
    Shellfish: "allergyShellfish",
    Sesame: "allergySesame",
    Mustard: "allergyMustard",
    Celery: "allergyCelery",
    Sulphites: "allergySulphites",
};
