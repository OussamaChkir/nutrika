import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    User,
    LogOut,
    Scan,
    Package,
    Edit,
    Shield,
    Scale,
    Ruler,
    Calendar,
    AlertTriangle,
    History,
    Crown,
} from "lucide-react";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    // Get user stats, profile data, and scan history
    const [productsCount, contributionsCount, userData, scanHistory] =
        await Promise.all([
            prisma.product.count({
                where: { createdById: session.user.id },
            }),
            prisma.contribution.count({
                where: { userId: session.user.id },
            }),
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    weight: true,
                    height: true,
                    dateOfBirth: true,
                    allergies: true,
                    role: true,
                },
            }),
            prisma.scanHistory.findMany({
                where: { userId: session.user.id },
                orderBy: { scannedAt: "desc" },
                take: 10,
                include: {
                    product: {
                        select: {
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
            }),
        ]);

    const getInitials = (name?: string | null, email?: string | null) => {
        if (name) {
            return name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        return email?.slice(0, 2).toUpperCase() || "U";
    };

    const calculateAge = (dob: Date) => {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
            {/* Profile Card */}
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto">
                        <Avatar className="h-20 w-20">
                            <AvatarImage
                                src={session.user.image || undefined}
                            />
                            <AvatarFallback className="text-2xl">
                                {getInitials(
                                    session.user.name,
                                    session.user.email
                                )}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <CardTitle className="mt-4">
                        {session.user.name || "User"}
                    </CardTitle>
                    <CardDescription>{session.user.email}</CardDescription>
                    <div className="flex justify-center gap-2 mt-2">
                        {session.user.role === "ADMIN" && (
                            <Badge className="gap-1 w-fit">
                                <Shield className="h-3 w-3" />
                                Admin
                            </Badge>
                        )}
                        {session.user.role === "PREMIUM" && (
                            <Badge className="gap-1 w-fit bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                <Crown className="h-3 w-3" />
                                Premium
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                            <div className="text-2xl font-bold text-orange-600">
                                {productsCount}
                            </div>
                            <div className="text-sm text-neutral-500">
                                Products Added
                            </div>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                            <div className="text-2xl font-bold text-orange-600">
                                {contributionsCount}
                            </div>
                            <div className="text-sm text-neutral-500">
                                Contributions
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Health Profile */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                Health Profile
                            </h3>
                            <Link href="/profile/edit">
                                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                                    <Edit className="h-3.5 w-3.5" />
                                    Edit
                                </Button>
                            </Link>
                        </div>

                        {userData?.weight ||
                            userData?.height ||
                            userData?.dateOfBirth ||
                            (userData?.allergies && userData.allergies.length > 0) ? (
                            <div className="grid grid-cols-2 gap-3">
                                {userData.weight && (
                                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
                                        <Scale className="h-4 w-4 text-orange-500" />
                                        <div>
                                            <p className="text-xs text-neutral-500">
                                                Weight
                                            </p>
                                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                {userData.weight} kg
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {userData.height && (
                                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
                                        <Ruler className="h-4 w-4 text-orange-500" />
                                        <div>
                                            <p className="text-xs text-neutral-500">
                                                Height
                                            </p>
                                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                {userData.height} cm
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {userData.dateOfBirth && (
                                    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
                                        <Calendar className="h-4 w-4 text-orange-500" />
                                        <div>
                                            <p className="text-xs text-neutral-500">
                                                Age
                                            </p>
                                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                {calculateAge(
                                                    userData.dateOfBirth
                                                )}{" "}
                                                years
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {userData.allergies &&
                                    userData.allergies.length > 0 && (
                                        <div className="col-span-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                                <p className="text-xs text-neutral-500">
                                                    Allergies
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {userData.allergies.map(
                                                    (allergy) => (
                                                        <Badge
                                                            key={allergy}
                                                            variant="secondary"
                                                            className="text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                        >
                                                            {allergy}
                                                        </Badge>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        ) : (
                            <Link href="/profile/edit" className="block">
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 p-6 text-center transition-colors hover:border-orange-400 dark:border-neutral-700">
                                    <Edit className="h-6 w-6 text-neutral-400" />
                                    <p className="text-sm text-neutral-500">
                                        Add your weight, height, date of birth
                                        and allergies for personalized
                                        recommendations
                                    </p>
                                </div>
                            </Link>
                        )}
                    </div>

                    <Separator />

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                            Quick Actions
                        </h3>

                        <div className="space-y-2">
                            <Link href="/scan" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3"
                                >
                                    <Scan className="h-4 w-4" />
                                    Scan a Product
                                </Button>
                            </Link>

                            <Link href="/add-product" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3"
                                >
                                    <Package className="h-4 w-4" />
                                    Add New Product
                                </Button>
                            </Link>

                            {session.user.role === "ADMIN" && (
                                <Link href="/admin" className="block">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-3"
                                    >
                                        <Shield className="h-4 w-4" />
                                        Admin Panel
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Account Actions */}
                    <form action={signOutAction}>
                        <Button
                            type="submit"
                            variant="outline"
                            className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Scan History */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="h-5 w-5" />
                        Recent Scans
                    </CardTitle>
                    <CardDescription>
                        Your last {scanHistory.length} scanned products
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {scanHistory.length > 0 ? (
                        <div className="space-y-2">
                            {scanHistory.map((scan) => (
                                <Link
                                    key={scan.id}
                                    href={`/product/${scan.product.barcode}`}
                                    className="block"
                                >
                                    <div className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                                        {/* Product image */}
                                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                            {scan.product.imageUrl ? (
                                                <Image
                                                    src={
                                                        scan.product.imageUrl
                                                    }
                                                    alt={scan.product.name}
                                                    fill
                                                    className="object-contain p-1"
                                                    sizes="48px"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <Package className="h-5 w-5 text-neutral-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                {scan.product.name}
                                            </p>
                                            {scan.product.brand && (
                                                <p className="truncate text-xs text-neutral-500">
                                                    {scan.product.brand}
                                                </p>
                                            )}
                                            <p className="text-xs text-neutral-400">
                                                {scan.scannedAt.toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Score */}
                                        {scan.product.scoreLetter && (
                                            <div
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                style={{
                                                    backgroundColor:
                                                        scan.product
                                                            .scoreColor ||
                                                        "#f97316",
                                                }}
                                            >
                                                {scan.product.scoreLetter}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <Scan className="h-10 w-10 text-neutral-300" />
                            <p className="text-sm text-neutral-500">
                                No products scanned yet
                            </p>
                            <Link href="/scan">
                                <Button size="sm" className="mt-2 gap-2">
                                    <Scan className="h-4 w-4" />
                                    Scan Your First Product
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
