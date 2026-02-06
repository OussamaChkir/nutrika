import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, Scan, Package, Edit, Shield } from "lucide-react";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    // Get user stats
    const [productsCount, contributionsCount] = await Promise.all([
        prisma.product.count({
            where: { createdById: session.user.id },
        }),
        prisma.contribution.count({
            where: { userId: session.user.id },
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

    return (
        <div className="mx-auto max-w-lg px-4 py-8">
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={session.user.image || undefined} />
                            <AvatarFallback className="text-2xl">
                                {getInitials(session.user.name, session.user.email)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <CardTitle className="mt-4">{session.user.name || "User"}</CardTitle>
                    <CardDescription>{session.user.email}</CardDescription>
                    {session.user.role === "ADMIN" && (
                        <Badge className="mt-2 gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                        </Badge>
                    )}
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                            <div className="text-2xl font-bold text-orange-600">
                                {productsCount}
                            </div>
                            <div className="text-sm text-neutral-500">Products Added</div>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                            <div className="text-2xl font-bold text-orange-600">
                                {contributionsCount}
                            </div>
                            <div className="text-sm text-neutral-500">Contributions</div>
                        </div>
                    </div>

                    <Separator />

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                            Quick Actions
                        </h3>

                        <div className="space-y-2">
                            <Link href="/scan" className="block">
                                <Button variant="outline" className="w-full justify-start gap-3">
                                    <Scan className="h-4 w-4" />
                                    Scan a Product
                                </Button>
                            </Link>

                            <Link href="/add-product" className="block">
                                <Button variant="outline" className="w-full justify-start gap-3">
                                    <Package className="h-4 w-4" />
                                    Add New Product
                                </Button>
                            </Link>

                            {session.user.role === "ADMIN" && (
                                <Link href="/admin" className="block">
                                    <Button variant="outline" className="w-full justify-start gap-3">
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
        </div>
    );
}
