import { Resend } from "resend";

// Transactional email through Resend (https://resend.com). Server-side only.
//
// Env vars:
//   RESEND_API_KEY  API key from the Resend dashboard.
//   EMAIL_FROM      Sender, e.g. "Nutrika <no-reply@nutrikafood.com>". The domain must be verified in
//                   Resend. The default (onboarding@resend.dev) only delivers to your own Resend account
//                   email, which is fine to test but not for real users.
//
// Without RESEND_API_KEY, emails are printed to the server console outside production (handy in local
// development) and refused in production, so a missing key is never silent there.

export type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text: string;
};

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string };

const DEFAULT_FROM = "Nutrika <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    client ??= new Resend(apiKey);
    return client;
}

export function getEmailFrom(): string {
    return process.env.EMAIL_FROM || DEFAULT_FROM;
}

/** Never throws: callers get a result and decide what to show to the user. */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
    const resend = getClient();

    if (!resend) {
        if (process.env.NODE_ENV === "production") {
            console.error("[email] RESEND_API_KEY is not set: email not sent.");
            return { ok: false, error: "email_not_configured" };
        }
        console.info(`[email] RESEND_API_KEY not set, printing instead of sending.\nTo: ${to}\nSubject: ${subject}\n\n${text}`);
        return { ok: true };
    }

    try {
        const { data, error } = await resend.emails.send({ from: getEmailFrom(), to, subject, html, text });
        if (error) {
            console.error("[email] Resend rejected the email:", error.name, error.message);
            return { ok: false, error: error.name };
        }
        return { ok: true, id: data?.id };
    } catch (err) {
        console.error("[email] Sending failed:", err);
        return { ok: false, error: "send_failed" };
    }
}
