"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics";

/** Fires `personal_score_viewed` once per page view. Sends the status only, never health data. */
export function PersonalScoreTracker({ status }: { status: string }) {
    const fired = useRef(false);

    useEffect(() => {
        if (fired.current) return;
        fired.current = true;
        trackEvent("personal_score_viewed", { status });
    }, [status]);

    return null;
}
