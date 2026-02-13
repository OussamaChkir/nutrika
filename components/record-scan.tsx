"use client";

import { useEffect, useRef } from "react";

interface RecordScanProps {
    barcode: string;
    userId?: string;
}

/**
 * Client component that records a scan to the user's history.
 * Fires once on mount if the user is authenticated.
 */
export function RecordScan({ barcode, userId }: RecordScanProps) {
    const hasFired = useRef(false);

    useEffect(() => {
        if (!userId || hasFired.current) return;
        hasFired.current = true;

        fetch("/api/scan-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode }),
        }).catch(() => {
            // Silently fail – scan history is non-critical
        });
    }, [barcode, userId]);

    return null;
}
