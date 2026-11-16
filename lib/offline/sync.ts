// F8: when the connection returns, look up the barcodes that were scanned offline.
//
// Browser only (uses fetch and IndexedDB). iOS Safari has no Background Sync, so this runs on the
// `online` event and when the app opens, never in the background. A failed lookup stays queued
// and is tried again, up to MAX_ATTEMPTS.

import { isValidBarcode, looksLikeProduct, MAX_ATTEMPTS } from "./policy";
import { bumpAttempts, listQueue, putProduct, removeFromQueue } from "./store";

export interface SyncOutcome {
    /** Products that are now saved on the device and ready to open. */
    resolved: { barcode: string; name: string }[];
    /** Barcodes nobody knows (our database and Open Food Facts): dropped from the queue. */
    notFound: string[];
    /** Barcodes still waiting (network or server problem). */
    stillPending: string[];
}

export const OFFLINE_PRODUCT_ENDPOINT = "/api/offline/product";

export async function flushQueue(opts: { now?: number; fetchImpl?: typeof fetch } = {}): Promise<SyncOutcome> {
    const { fetchImpl = fetch } = opts;
    const outcome: SyncOutcome = { resolved: [], notFound: [], stillPending: [] };
    for (const item of await listQueue()) {
        if (!isValidBarcode(item.barcode)) {
            await removeFromQueue(item.barcode);
            continue;
        }
        const retry = async () => {
            const attempts = await bumpAttempts(item.barcode);
            if (attempts >= MAX_ATTEMPTS) await removeFromQueue(item.barcode);
            else outcome.stillPending.push(item.barcode);
        };
        let response: Response;
        try {
            response = await fetchImpl(`${OFFLINE_PRODUCT_ENDPOINT}/${item.barcode}`, { headers: { Accept: "application/json" }, cache: "no-store" });
        } catch {
            await retry();
            // No network at all: do not hammer the rest of the queue.
            break;
        }
        if (response.status === 404) {
            await removeFromQueue(item.barcode);
            outcome.notFound.push(item.barcode);
            continue;
        }
        if (!response.ok) {
            await retry();
            continue;
        }
        let body: unknown;
        try {
            body = await response.json();
        } catch {
            await retry();
            continue;
        }
        const product = (body as { product?: unknown } | null)?.product;
        if (!looksLikeProduct(product) || product.barcode !== item.barcode) {
            await retry();
            continue;
        }
        await putProduct(product, opts.now ?? Date.now(), "queue");
        await removeFromQueue(item.barcode);
        outcome.resolved.push({ barcode: item.barcode, name: product.name });
    }
    return outcome;
}
