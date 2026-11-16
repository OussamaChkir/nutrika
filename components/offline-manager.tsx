"use client";

// F8: mounted once in the layout (only when the flag is on).
//  - shows an "Offline" pill while the browser reports no connection
//  - when the connection returns (and when the app opens online) looks up the barcodes that were
//    scanned offline and tells the user which are ready
//  - when nobody is signed in, removes any profile copy kept on this device

import { Check, WifiOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Link } from "@/i18n/routing";
import { setProfiles } from "@/lib/offline/store";
import { flushQueue, type SyncOutcome } from "@/lib/offline/sync";

const subscribe = (notify: () => void) => {
    window.addEventListener("online", notify);
    window.addEventListener("offline", notify);
    return () => {
        window.removeEventListener("online", notify);
        window.removeEventListener("offline", notify);
    };
};

/** True while the browser reports an active connection. Server render assumes online. */
export function useOnline(): boolean {
    return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function OfflineManager({ signedIn }: { signedIn: boolean }) {
    const t = useTranslations("Offline");
    const online = useOnline();
    const [outcome, setOutcome] = useState<SyncOutcome | null>(null);

    // Shared device safety: signed out means no profile copy stays behind.
    useEffect(() => {
        if (!signedIn) void setProfiles(null, null).catch(() => undefined);
    }, [signedIn]);

    useEffect(() => {
        if (!online) return;
        let cancelled = false;
        flushQueue()
            .then((result) => {
                if (!cancelled && (result.resolved.length > 0 || result.notFound.length > 0)) setOutcome(result);
            })
            .catch(() => undefined); // storage unavailable: nothing to sync
        return () => {
            cancelled = true;
        };
    }, [online]);

    return (
        <>
            {!online && (
                <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
                    <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
                        <WifiOff className="h-4 w-4" aria-hidden />
                        <span>{t("badge")}</span>
                        <span className="hidden text-xs font-normal opacity-80 sm:inline">{t("badgeHint")}</span>
                    </div>
                </div>
            )}

            {online && outcome && (
                <div role="status" className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
                    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                            <div className="min-w-0 flex-1 space-y-1">
                                {outcome.resolved.length > 0 && <p className="font-semibold text-neutral-900 dark:text-neutral-50">{t("sync.ready", { count: outcome.resolved.length })}</p>}
                                <ul className="space-y-1">
                                    {outcome.resolved.slice(0, 3).map((p) => (
                                        <li key={p.barcode}>
                                            <Link href={`/product/${p.barcode}`} className="font-semibold text-orange-600 hover:underline dark:text-orange-400" onClick={() => setOutcome(null)}>
                                                {t("sync.view", { name: p.name })}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                {outcome.notFound.length > 0 && <p className="text-neutral-600 dark:text-neutral-400">{t("sync.notFound", { count: outcome.notFound.length })}</p>}
                            </div>
                            <button type="button" onClick={() => setOutcome(null)} aria-label={t("sync.dismiss")} className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <X className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
