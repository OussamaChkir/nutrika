import { NextResponse } from "next/server";

import { buildMobileConfig } from "@/lib/mobile/config";

export const dynamic = "force-dynamic"; // MOBILE_MIN_APP_VERSION must be read at request time, not frozen at build

// GET /api/v1/config – public. Feature flags, minimum app version and available sign-in methods.
export async function GET() {
    return NextResponse.json(buildMobileConfig(), {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
}
