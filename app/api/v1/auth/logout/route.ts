import { NextResponse } from "next/server";

import { parseBody } from "@/lib/mobile/http";
import { logoutBody } from "@/lib/mobile/schemas";
import { revokeRefreshToken } from "@/lib/mobile/sessions";

// POST /api/v1/auth/logout – { refreshToken }: signs this device out. Always 204, even for an unknown
// token, so the app can clear its local session without worrying about the answer.
export async function POST(request: Request) {
    const parsed = await parseBody(request, logoutBody);
    if ("response" in parsed) return parsed.response;
    try {
        await revokeRefreshToken(parsed.data.refreshToken);
    } catch (error) {
        console.error("v1 logout error:", error);
    }
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
