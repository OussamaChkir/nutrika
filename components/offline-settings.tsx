"use client";

// F8: storage management. Shows what is kept on this device and lets the user clear it.

import { HardDrive } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearAll, getStats, type StorageStats } from "@/lib/offline/store";

type State = { kind: "loading" } | { kind: "ready"; stats: StorageStats } | { kind: "unavailable" } | { kind: "failed" };

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OfflineSettings() {
    const t = useTranslations("Offline.settings");
    const [state, setState] = useState<State>({ kind: "loading" });
    const [cleared, setCleared] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (typeof indexedDB === "undefined") {
            Promise.resolve().then(() => !cancelled && setState({ kind: "unavailable" }));
        } else {
            getStats()
                .then((stats) => !cancelled && setState({ kind: "ready", stats }))
                .catch(() => !cancelled && setState({ kind: "failed" }));
        }
        return () => {
            cancelled = true;
        };
    }, []);

    async function clear() {
        try {
            await clearAll();
            setState({ kind: "ready", stats: await getStats() });
            setCleared(true);
        } catch {
            setState({ kind: "failed" });
        }
    }

    return (
        <section aria-labelledby="offline-settings-title" className="space-y-3">
            <h3 id="offline-settings-title" className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-50">
                <HardDrive className="h-4 w-4" aria-hidden /> {t("title")}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("description")}</p>
            {state.kind === "ready" && (
                <>
                    <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                        <li>{t("products", { count: state.stats.products })} ({t("size", { size: formatBytes(state.stats.approxBytes) })})</li>
                        <li>{state.stats.profiles > 0 ? t("profileSaved") : t("profileNone")}</li>
                        {state.stats.pending > 0 && <li>{t("pending", { count: state.stats.pending })}</li>}
                    </ul>
                    <Button variant="outline" onClick={clear} disabled={state.stats.products + state.stats.profiles + state.stats.pending === 0}>{t("clear")}</Button>
                    {cleared && <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("cleared")}</p>}
                </>
            )}
            {state.kind === "unavailable" && <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("unavailable")}</p>}
            {state.kind === "failed" && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("failed")}</p>}
        </section>
    );
}
