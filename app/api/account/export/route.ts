import { NextResponse } from "next/server";

import { buildAccountExport } from "@/lib/account-data";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/account/export – the signed-in user's own data as a JSON download.
// Only ever reads rows of session.user.id; the file is never cached.
export async function GET() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productSelect = { barcode: true, name: true, brand: true } as const;
    const [user, profiles, scans, favorites, feedbacks, contributions, productsAdded] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, name: true, email: true, image: true, role: true, createdAt: true,
                weight: true, height: true, dateOfBirth: true, allergies: true,
            },
        }),
        prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.scanHistory.findMany({
            where: { userId }, orderBy: { scannedAt: "desc" },
            select: { scannedAt: true, product: { select: productSelect } },
        }),
        prisma.favorite.findMany({
            where: { userId }, orderBy: { createdAt: "desc" },
            select: { createdAt: true, product: { select: productSelect } },
        }),
        prisma.productFeedback.findMany({
            where: { userId },
            select: { rating: true, comment: true, createdAt: true, product: { select: { barcode: true, name: true } } },
        }),
        prisma.contribution.findMany({
            where: { userId },
            select: { id: true, status: true, reason: true, changes: true, createdAt: true },
        }),
        prisma.product.findMany({
            where: { createdById: userId },
            select: { barcode: true, name: true, brand: true, status: true, createdAt: true },
        }),
    ]);

    if (!user) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = buildAccountExport(
        { user, profiles, scans, favorites, feedbacks, contributions, productsAdded },
        new Date()
    );
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(body, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="nutrika-data-${stamp}.json"`,
            "Cache-Control": "no-store",
        },
    });
}
