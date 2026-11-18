// What the app is told about a user. An explicit allow-list: the password hash and any provider
// tokens must never leave through here.

export interface UserRow {
    id: string;
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
    role: string;
    passwordHash: string | null;
    createdAt: Date;
    accounts?: Array<{ provider: string }>;
}

export interface MobileUser {
    id: string;
    name: string | null;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string;
    /** false for accounts that only use Apple/Google: the app hides "change password". */
    hasPassword: boolean;
    /** Linked sign-in methods, e.g. ["google"]. */
    providers: string[];
    createdAt: string;
}

export function toMobileUser(user: UserRow): MobileUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified !== null,
        image: user.image,
        role: user.role,
        hasPassword: user.passwordHash !== null && user.passwordHash.length > 0,
        providers: [...new Set((user.accounts ?? []).map((a) => a.provider))].sort(),
        createdAt: user.createdAt.toISOString(),
    };
}

export const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
    passwordHash: true,
    createdAt: true,
    accounts: { select: { provider: true } },
} as const;
