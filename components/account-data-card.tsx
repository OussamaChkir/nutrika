"use client";

import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DeleteAccountResult } from "@/lib/account-delete";

interface AccountDataCardProps {
    /** Shown so the user knows exactly what to type. */
    email: string;
    /** Admins cannot delete themselves here. */
    canDelete: boolean;
    /**
     * The server action, passed by the page. Not imported here so Storybook never bundles
     * server-only code (auth, database).
     */
    onDelete: (typedEmail: string) => Promise<DeleteAccountResult>;
}

/** "Download my data" and "Delete my account" (type your email to confirm). */
export function AccountDataCard({ email, canDelete, onDelete }: AccountDataCardProps) {
    const t = useTranslations("AccountData");
    const [confirming, setConfirming] = useState(false);
    const [typed, setTyped] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = () => {
        setError(null);
        startTransition(async () => {
            const result = await onDelete(typed);
            // On success the server redirects, so we only get here on failure.
            if (result && !result.ok) setError(result.error);
        });
    };

    const matches = typed.trim() !== "" && typed.trim().toLowerCase() === email.trim().toLowerCase();

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-sm font-semibold">{t("title")}</h3>
                <p className="text-sm text-muted-foreground">{t("intro")}</p>
            </div>

            <Button asChild variant="outline" className="w-full justify-start gap-3">
                <a href="/api/account/export" download>
                    <Download className="h-4 w-4" aria-hidden />
                    {t("export")}
                </a>
            </Button>

            {canDelete ? (
                !confirming ? (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setConfirming(true)}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {t("delete")}
                    </Button>
                ) : (
                    <div role="group" aria-labelledby="delete-account-title" className="space-y-3 rounded-lg border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/30">
                        <p id="delete-account-title" className="text-sm font-semibold text-red-700 dark:text-red-300">
                            {t("deleteTitle")}
                        </p>
                        <p className="text-sm">{t("deleteWarning")}</p>
                        <div className="space-y-1.5">
                            <Label htmlFor="delete-account-email">{t("typeEmail", { email })}</Label>
                            <Input
                                id="delete-account-email"
                                type="email"
                                autoComplete="off"
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                            />
                        </div>
                        {error && (
                            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                                {t(`errors.${error}` as never)}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => { setConfirming(false); setTyped(""); setError(null); }} disabled={pending}>
                                {t("cancel")}
                            </Button>
                            <Button type="button" className="bg-red-600 text-white hover:bg-red-700" onClick={submit} disabled={!matches || pending}>
                                {pending ? t("deleting") : t("confirmDelete")}
                            </Button>
                        </div>
                    </div>
                )
            ) : (
                <p className="text-xs text-muted-foreground">{t("adminNote")}</p>
            )}
        </div>
    );
}
