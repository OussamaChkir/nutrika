import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listScanHistory, recordScan } from "@/lib/history/service";

// GET /api/scan-history – return last 10 scans for authenticated user
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await listScanHistory(session.user.id);
    return NextResponse.json({ history });
}

// POST /api/scan-history – record a scan (upsert: update timestamp if already scanned)
export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { barcode } = body;

        if (!barcode || typeof barcode !== "string") {
            return NextResponse.json(
                { error: "Barcode is required" },
                { status: 400 }
            );
        }

        const found = await recordScan(session.user.id, barcode);
        if (!found) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to record scan" },
            { status: 500 }
        );
    }
}
