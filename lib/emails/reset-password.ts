import { RESET_TOKEN_TTL_MINUTES, normalizeLocale } from "../password-reset";

type Copy = {
    subject: string;
    greeting: (name?: string | null) => string;
    intro: string;
    button: string;
    fallback: string;
    expiry: (minutes: number) => string;
    ignore: string;
};

const COPY: Record<"en" | "fr", Copy> = {
    en: {
        subject: "Reset your Nutrika password",
        greeting: (name) => (name ? `Hi ${name},` : "Hi,"),
        intro: "We received a request to reset the password of your Nutrika account.",
        button: "Choose a new password",
        fallback: "If the button does not work, copy this link into your browser:",
        expiry: (minutes) => `This link works for ${minutes} minutes and can be used only once.`,
        ignore: "If you did not ask for this, you can ignore this email. Your password stays the same.",
    },
    fr: {
        subject: "Réinitialisez votre mot de passe Nutrika",
        greeting: (name) => (name ? `Bonjour ${name},` : "Bonjour,"),
        intro: "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Nutrika.",
        button: "Choisir un nouveau mot de passe",
        fallback: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :",
        expiry: (minutes) => `Ce lien est valable ${minutes} minutes et ne peut être utilisé qu'une seule fois.`,
        ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe reste inchangé.",
    },
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export type ResetPasswordEmailInput = {
    resetUrl: string;
    locale?: string;
    name?: string | null;
};

export function buildResetPasswordEmail({ resetUrl, locale, name }: ResetPasswordEmailInput) {
    const copy = COPY[normalizeLocale(locale)];
    const greeting = copy.greeting(name);
    const expiry = copy.expiry(RESET_TOKEN_TTL_MINUTES);

    const text = [
        greeting,
        "",
        copy.intro,
        "",
        resetUrl,
        "",
        expiry,
        copy.ignore,
        "",
        "Nutrika",
    ].join("\n");

    const safeUrl = escapeHtml(resetUrl);
    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#f97316;">Nutrika</p>
                <p style="margin:24px 0 8px;font-size:16px;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${escapeHtml(copy.intro)}</p>
                <p style="margin:0 0 24px;">
                  <a href="${safeUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;">${escapeHtml(copy.button)}</a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(copy.fallback)}</p>
                <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${safeUrl}" style="color:#f97316;">${safeUrl}</a></p>
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(expiry)}</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">${escapeHtml(copy.ignore)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { subject: copy.subject, html, text };
}
