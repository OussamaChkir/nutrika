import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_HISTORY = 10;

// GET /api/scan-history – return last 10 scans for authenticated user
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await prisma.scanHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { scannedAt: "desc" },
        take: MAX_HISTORY,
        include: {
            product: {
                select: {
                    id: true,
                    barcode: true,
                    name: true,
                    brand: true,
                    imageUrl: true,
                    score: true,
                    scoreLetter: true,
                    scoreColor: true,
                },
            },
        },
    });

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

        // Find the product
        const product = await prisma.product.findUnique({
            where: { barcode },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        // Upsert: if user already scanned this product, just update the timestamp
        await prisma.scanHistory.upsert({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId: product.id,
                },
            },
            update: {
                scannedAt: new Date(),
            },
            create: {
                userId: session.user.id,
                productId: product.id,
            },
        });

        // Prune old entries – keep only the latest MAX_HISTORY
        const allScans = await prisma.scanHistory.findMany({
            where: { userId: session.user.id },
            orderBy: { scannedAt: "desc" },
            select: { id: true },
        });

        if (allScans.length > MAX_HISTORY) {
            const idsToDelete = allScans.slice(MAX_HISTORY).map((s: { id: string }) => s.id);
            await prisma.scanHistory.deleteMany({
                where: { id: { in: idsToDelete } },
            });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to record scan" },
            { status: 500 }
        );
    }
}
