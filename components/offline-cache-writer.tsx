"use client";

// F8: write-through cache. Rendered on the product page (online), it saves what the page just
// showed so the same verdict can be rebuilt without a connection. Renders nothing.
//
// `profiles` is the signed-in user's current profiles. `null` (signed out, or personal score off)
// removes any profile copy, so the next person using this device never sees someone else's.

import { useEffect } from "react";

import type { ProfileSnapshot } from "@/lib/offline/policy";
import { putProduct, setProfiles } from "@/lib/offline/store";
import type { Product } from "@/lib/product";

interface Props {
    product: Product;
    /** undefined: leave the stored profiles alone (they could not be loaded just now). */
    profiles?: ProfileSnapshot[] | null;
    activeId: string | null;
}

export function OfflineCacheWriter({ product, profiles, activeId }: Props) {
    useEffect(() => {
        // Never let storage problems (private mode, full disk) affect the page.
        void putProduct(product, Date.now()).catch(() => undefined);
        if (profiles !== undefined) void setProfiles(profiles, activeId).catch(() => undefined);
    }, [product, profiles, activeId]);
    return null;
}
