import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileFormSchema } from "@/lib/validators";

// PUT /api/profile – update user health profile
export async function PUT(request: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validated = profileFormSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid data", details: validated.error.flatten() },
                { status: 400 }
            );
        }

        const { weight, height, dateOfBirth, allergies } = validated.data;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                weight: weight ?? null,
                height: height ?? null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                allergies: allergies ?? [],
            },
        });

        return NextResponse.json({
            success: true,
            user: {
                weight: updatedUser.weight,
                height: updatedUser.height,
                dateOfBirth: updatedUser.dateOfBirth,
                allergies: updatedUser.allergies,
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}

// GET /api/profile – get current user's profile data
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            name: true,
            email: true,
            image: true,
            role: true,
            weight: true,
            height: true,
            dateOfBirth: true,
            allergies: true,
        },
    });

    return NextResponse.json({ user });
}
