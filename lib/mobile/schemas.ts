import { z } from "zod";

import { newPasswordSchema } from "../validators";

// Request bodies of the /api/v1 endpoints. Password rules are the web ones (one source of truth).

export const deviceSchema = z
    .object({
        deviceName: z.string().trim().max(80).optional(),
        platform: z.enum(["ios", "android"]).optional(),
    })
    .optional();

const email = z.string().trim().toLowerCase().email("Invalid email address").max(254);

export const registerBody = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email,
    password: newPasswordSchema,
    device: deviceSchema,
});

export const loginBody = z.object({
    email,
    password: z.string().min(1, "Password is required").max(200),
    device: deviceSchema,
});

export const refreshBody = z.object({
    refreshToken: z.string().min(1, "refreshToken is required").max(200),
    device: deviceSchema,
});

export const logoutBody = z.object({
    refreshToken: z.string().min(1).max(200),
});

export const socialBody = z.object({
    idToken: z.string().min(10, "idToken is required").max(4096),
    /** Raw nonce the app generated; the token must carry it (or its SHA-256). Strongly recommended. */
    nonce: z.string().min(8).max(200).optional(),
    /** Apple only returns the name on the very first sign-in; the app forwards it. */
    fullName: z.string().trim().max(120).optional(),
    device: deviceSchema,
});

export const forgotBody = z.object({
    email,
    locale: z.enum(["en", "fr"]).optional(),
});

export const resetBody = z.object({
    token: z.string().min(1, "This reset link is invalid or has expired.").max(200),
    password: newPasswordSchema,
});

export const deleteBody = z.object({
    /** The user types their own email to confirm, as on the web. */
    email: z.string().trim().min(1, "Email is required").max(254),
});
