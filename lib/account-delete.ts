// Rules for deleting your own account. Pure, so the safety checks are testable.

export type DeleteCheck = "ok" | "email_mismatch" | "admin_blocked";

/**
 * The user must type their own email to confirm (case and surrounding spaces ignored),
 * and admins cannot delete themselves from here: the last admin would lock everyone out.
 */
export function checkAccountDeletion(account: { email: string; role: string }, typedEmail: string): DeleteCheck {
    if (account.role === "ADMIN") return "admin_blocked";
    const typed = typedEmail.trim().toLowerCase();
    return typed.length > 0 && typed === account.email.trim().toLowerCase() ? "ok" : "email_mismatch";
}

export type DeleteAccountResult = {
    ok: false;
    error: "unauthorized" | "email_mismatch" | "admin_blocked" | "failed";
};
