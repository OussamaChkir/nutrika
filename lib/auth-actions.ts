"use server";

import bcrypt from "bcryptjs";
import { signIn, signOut } from "./auth";
import { prisma } from "./db";
import { signUpSchema, SignUpInput, forgotPasswordSchema, resetPasswordSchema } from "./validators";
import { AuthError } from "next-auth";
import { sendEmail } from "./email";
import { buildResetPasswordEmail } from "./emails/reset-password";
import {
    buildResetUrl,
    generateResetToken,
    hashResetToken,
    isResetRequestThrottled,
    isResetTokenExpired,
    resetTokenExpiry,
} from "./password-reset";

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
// PASSWORD RESET (email sent with Resend)
// ============================================

const INVALID_RESET_LINK = "This reset link is invalid or has expired. Please request a new one.";

/**
 * Sends a reset link by email. The answer is the same whether or not an account exists for the
 * address, so this cannot be used to find out who has an account. Only an invalid email format is reported.
 */
export async function requestPasswordResetAction(email: string, locale?: string): Promise<AuthResult> {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: { id: true, name: true, email: true },
        });
        if (!user) return { success: true };

        const latest = await prisma.passwordResetToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });
        if (isResetRequestThrottled(latest?.createdAt)) return { success: true };

        // One valid link at a time: a new request replaces the previous one.
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

        const { token, tokenHash } = generateResetToken();
        const created = await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt: resetTokenExpiry() },
            select: { id: true },
        });

        const message = buildResetPasswordEmail({
            resetUrl: buildResetUrl(token, locale),
            locale,
            name: user.name,
        });
        const sent = await sendEmail({ to: user.email, ...message });

        if (!sent.ok) {
            // Nothing was delivered, so the link is useless: drop it and let the user retry right away.
            await prisma.passwordResetToken.deleteMany({ where: { id: created.id } });
        }
    } catch (error) {
        console.error("Password reset request error:", error);
    }

    return { success: true };
}

export async function resetPasswordAction(
    token: string,
    password: string,
    confirmPassword: string
): Promise<AuthResult> {
    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" };
    }

    try {
        const record = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashResetToken(parsed.data.token) },
        });
        if (!record || isResetTokenExpired(record.expiresAt)) {
            return { success: false, error: INVALID_RESET_LINK };
        }

        // Claim the token before changing anything: if two requests race, only one gets count === 1.
        const claimed = await prisma.passwordResetToken.deleteMany({ where: { id: record.id } });
        if (claimed.count !== 1) {
            return { success: false, error: INVALID_RESET_LINK };
        }

        const passwordHash = await bcrypt.hash(parsed.data.password, 12);
        await prisma.user.update({
            where: { id: record.userId },
            data: { passwordHash },
        });
        await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });

        return { success: true };
    } catch (error) {
        console.error("Password reset error:", error);
        return { success: false, error: "Something went wrong. Please try again." };
    }
}

// ============================================
// SIGN OUT
// ============================================

export async function signOutAction() {
    await signOut({ redirectTo: "/" });
}
