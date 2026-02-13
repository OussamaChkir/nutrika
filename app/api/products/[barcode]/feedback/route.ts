import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { feedbackFormSchema } from "@/lib/validators";

interface RouteParams {
    params: Promise<{ barcode: string }>;
}

// GET /api/products/[barcode]/feedback – list all feedback for a product
export async function GET(_request: Request, { params }: RouteParams) {
    const { barcode } = await params;

    const product = await prisma.product.findUnique({
        where: { barcode },
        select: { id: true },
    });

    if (!product) {
        return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
        );
    }

    const feedbacks = await prisma.productFeedback.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    });

    return NextResponse.json({ feedbacks });
}

// POST /api/products/[barcode]/feedback – submit feedback (PREMIUM/ADMIN only)
export async function POST(request: Request, { params }: RouteParams) {
    const { barcode } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check premium/admin role
    if (session.user.role !== "PREMIUM" && session.user.role !== "ADMIN") {
        return NextResponse.json(
            { error: "This feature is for Premium members only" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const validated = feedbackFormSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid data", details: validated.error.flatten() },
                { status: 400 }
            );
        }

        const product = await prisma.product.findUnique({
            where: { barcode },
            select: { id: true },
        });

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        // Upsert – one feedback per user per product
        const feedback = await prisma.productFeedback.upsert({
            where: {
                userId_productId: {
                    userId: session.user.id,
                    productId: product.id,
                },
            },
            create: {
                userId: session.user.id,
                productId: product.id,
                rating: validated.data.rating,
                comment: validated.data.comment || null,
            },
            update: {
                rating: validated.data.rating,
                comment: validated.data.comment || null,
            },
        });

        return NextResponse.json({ success: true, feedback });
    } catch {
        return NextResponse.json(
            { error: "Failed to submit feedback" },
            { status: 500 }
        );
    }
}
