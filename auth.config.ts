import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "./lib/validators";
import bcrypt from "bcryptjs";

// Notice this is only an object, not a full Auth.js instance
export const authConfig = {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // Return null here or stub implementation if this runs on edge
                // In actual Edge middleware, we might only check JWTs, not full DB auth
                // But for pure middleware routing protection, we just need the config structure
                return null; 
            },
        }),
    ],
    pages: {
        signIn: "/sign-in",
        error: "/sign-in",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
             if (user) {
                token.id = user.id;
                token.role = (user as any).role || "USER";
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
