"use server";

import bcrypt from "bcryptjs";
import { signIn, signOut } from "./auth";
import { prisma } from "./db";
import { signUpSchema, SignUpInput } from "./validators";
import { AuthError } from "next-auth";

export type AuthResult = {
    success: boolean;
    error?: string;
};

// ============================================
// SIGN UP
// ============================================

export async function signUpAction(data: SignUpInput): Promise<AuthResult> {
    try {
        const validatedFields = signUpSchema.safeParse(data);

        if (!validatedFields.success) {
            return {
                success: false,
                error: validatedFields.error.errors[0]?.message || "Invalid input",
            };
        }

        const { name, email, password } = validatedFields.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return {
                success: false,
                error: "An account with this email already exists",
            };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: "USER",
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Sign up error:", error);
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
    }
}

// ============================================
// SIGN IN
// ============================================

export async function signInWithCredentials(
    email: string,
    password: string
): Promise<AuthResult> {
    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { success: false, error: "Invalid email or password" };
                default:
                    return { success: false, error: "Something went wrong" };
            }
        }
        throw error;
    }
}

export async function signInWithGoogle() {
    await signIn("google", { redirectTo: "/" });
}

// ============================================
// SIGN OUT
// ============================================

export async function signOutAction() {
    await signOut({ redirectTo: "/" });
}
