import { NextResponse } from "next/server";

import { loadAccountExport } from "@/lib/account-export";
import { auth } from "@/lib/auth";

// GET /api/account/export – the signed-in user's own data as a JSON download.
// Only ever reads rows of session.user.id; the file is never cached.
export async function GET() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await loadAccountExport(userId);
    if (!body) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(body, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="nutrika-data-${stamp}.json"`,
            "Cache-Control": "no-store",
        },
    });
}
