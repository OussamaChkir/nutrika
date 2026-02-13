import { z } from "zod";

// ============================================
// AUTH SCHEMAS
// ============================================

export const signUpSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            ),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const productFormSchema = z.object({
    barcode: z
        .string()
        .min(8, "Barcode must be at least 8 characters")
        .max(14, "Barcode must be at most 14 characters")
        .regex(/^\d+$/, "Barcode must contain only numbers"),
    name: z.string().min(2, "Product name is required"),
    brand: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    ingredients: z.string().optional(),
    // Nutrition per 100g
    energy: z.coerce.number().min(0).optional(),
    fat: z.coerce.number().min(0).optional(),
    saturatedFat: z.coerce.number().min(0).optional(),
    carbohydrates: z.coerce.number().min(0).optional(),
    sugars: z.coerce.number().min(0).optional(),
    fiber: z.coerce.number().min(0).optional(),
    proteins: z.coerce.number().min(0).optional(),
    salt: z.coerce.number().min(0).optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

// ============================================
// CONTRIBUTION SCHEMAS
// ============================================

export const contributionSchema = z.object({
    productId: z.string(),
    changes: z.object({
        name: z.string().optional(),
        brand: z.string().optional(),
        imageUrl: z.string().url().optional(),
        ingredients: z.string().optional(),
        energy: z.number().optional(),
        fat: z.number().optional(),
        saturatedFat: z.number().optional(),
        carbohydrates: z.number().optional(),
        sugars: z.number().optional(),
        fiber: z.number().optional(),
        proteins: z.number().optional(),
        salt: z.number().optional(),
    }),
    reason: z.string().min(10, "Please provide a reason for your edit"),
});

export type ContributionInput = z.infer<typeof contributionSchema>;

// ============================================
// BARCODE SCHEMA
// ============================================

export const barcodeSchema = z
    .string()
    .min(8, "Barcode must be at least 8 characters")
    .max(14, "Barcode must be at most 14 characters")
    .regex(/^\d+$/, "Invalid barcode format");

// ============================================
// ADMIN SCHEMAS
// ============================================

export const reviewContributionSchema = z.object({
    contributionId: z.string(),
    action: z.enum(["approve", "reject"]),
    reviewNote: z.string().optional(),
});

export type ReviewContributionInput = z.infer<typeof reviewContributionSchema>;

export const promoteUserSchema = z.object({
    userId: z.string(),
    role: z.enum(["USER", "ADMIN"]),
});

export type PromoteUserInput = z.infer<typeof promoteUserSchema>;

// ============================================
// PROFILE SCHEMAS
// ============================================

export const ALLERGY_OPTIONS = [
    "Gluten",
    "Lactose",
    "Milk",
    "Eggs",
    "Peanuts",
    "Tree Nuts",
    "Soy",
    "Fish",
    "Shellfish",
    "Sesame",
    "Mustard",
    "Celery",
    "Sulphites",
] as const;

export const profileFormSchema = z.object({
    weight: z.coerce.number().min(1).max(500).optional().nullable(),
    height: z.coerce.number().min(30).max(300).optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    allergies: z.array(z.string()).optional().nullable(),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;

// ============================================
// FEEDBACK SCHEMAS
// ============================================

export const feedbackFormSchema = z.object({
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export type FeedbackFormInput = z.infer<typeof feedbackFormSchema>;
