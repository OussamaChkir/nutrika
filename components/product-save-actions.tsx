"use client";

import { Ban, Check, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics";
import { nextState, type SavedState } from "@/lib/shopping/rules";
import type { ActionError, ProductSaveActions } from "@/lib/shopping/types";

interface ProductSaveActionsProps {
    barcode: string;
    signedIn: boolean;
    initialState: SavedState | null;
    /** True when the product is already on the list (unchecked). */
    initialOnList: boolean;
    /** Server actions, passed by the page so Storybook never bundles server code. */
    actions: ProductSaveActions;
}

/** After a scan: Approve, Add to list, Avoid. The mark shows at once and is undone if the server refuses. */
export function ProductSaveActionsBar({ barcode, signedIn, initialState, initialOnList, actions }: ProductSaveActionsProps) {
    const t = useTranslations("Shopping");
    const [state, setState] = useState<SavedState | null>(initialState);
    const [onList, setOnList] = useState(initialOnList);
    const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
    const [pending, startTransition] = useTransition();

    if (!signedIn) {
        return (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <p className="flex-1 text-neutral-600 dark:text-neutral-400">{t("actions.signIn")}</p>
                <Button asChild size="sm" variant="outline">
                    <Link href="/sign-in">{t("actions.signInButton")}</Link>
                </Button>
            </div>
        );
    }

    const fail = (error: ActionError) => setMessage({ text: t(`errors.${error}`), isError: true });

    const choose = (requested: SavedState) => {
        const before = state;
        setState(nextState(before, requested)); // optimistic
        setMessage(null);
        startTransition(async () => {
            const result = await actions.setState(barcode, requested);
            if (!result.ok) {
                setState(before);
                fail(result.error);
                return;
            }
            setState(result.state);
            trackEvent("product_state_set", { state: result.state ?? "cleared" });
            setMessage({
                text: result.state === "approved" ? t("actions.approvedNow") : result.state === "avoid" ? t("actions.avoidNow") : t("actions.cleared"),
                isError: false,
            });
        });
    };

    const addToList = () => {
        setMessage(null);
        startTransition(async () => {
            const result = await actions.addToList(barcode);
            if (!result.ok) {
                fail(result.error);
                return;
            }
            setOnList(true);
            trackEvent("list_item_added", { source: "scan" });
            if (result.firstItem) trackEvent("list_created");
            setMessage({ text: t("actions.added"), isError: false });
        });
    };

    return (
        <div className="mt-4 space-y-2">
            <div role="group" aria-label={t("actions.group")} className="grid grid-cols-3 gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={state === "approved" ? "default" : "outline"}
                    aria-pressed={state === "approved"}
                    disabled={pending}
                    onClick={() => choose("approved")}
                >
                    <Check aria-hidden />
                    {t("actions.approve")}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={addToList}>
                    <ShoppingCart aria-hidden />
                    {onList ? t("actions.onList") : t("actions.addToList")}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={state === "avoid" ? "destructive" : "outline"}
                    aria-pressed={state === "avoid"}
                    disabled={pending}
                    onClick={() => choose("avoid")}
                >
                    <Ban aria-hidden />
                    {t("actions.avoid")}
                </Button>
            </div>
            <p
                role="status"
                aria-live="polite"
                className={`min-h-5 text-sm ${message?.isError ? "text-red-600 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}`}
            >
                {message?.text}
            </p>
        </div>
    );
}
