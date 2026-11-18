import bcrypt from "bcryptjs";

import { prisma } from "../db";

import { USER_SELECT } from "./user";

// A real bcrypt hash of a random string, compared when the account does not exist, so the answer
// takes about as long either way and does not reveal which emails are registered.
const DUMMY_HASH = "$2a$12$f7hMsFcoMhGPVEMcrQAWbufjPn/JL3DYrUXF0Yegyz5yuWaBtoRgK";

/**
 * Finds an account by email. New accounts store the lowercase address, but web sign-ups made before
 * the app did not lowercase, so when the exact lookup (indexed, fast) misses we retry case-insensitively.
 */
export async function findUserByEmail(emailLower: string) {
    const exact = await prisma.user.findUnique({ where: { email: emailLower }, select: USER_SELECT });
    if (exact) return exact;
    return prisma.user.findFirst({ where: { email: { equals: emailLower, mode: "insensitive" } }, select: USER_SELECT });
}

/** Returns the user only if the password matches. Takes the same time whether or not the account exists. */
export async function verifyPassword(emailLower: string, password: string) {
    const user = await findUserByEmail(emailLower);
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    return user && user.passwordHash && ok ? user : null;
}
