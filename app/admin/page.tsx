import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Users, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";

export default async function AdminDashboardPage() {
    // Get stats
    const [
        totalProducts,
        pendingContributions,
        approvedContributions,
        rejectedContributions,
        totalUsers,
        recentContributions,
    ] = await Promise.all([
        prisma.product.count(),
        prisma.contribution.count({ where: { status: "PENDING" } }),
        prisma.contribution.count({ where: { status: "APPROVED" } }),
        prisma.contribution.count({ where: { status: "REJECTED" } }),
        prisma.user.count(),
        prisma.contribution.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, email: true } },
                product: { select: { name: true, barcode: true } },
            },
        }),
    ]);

    const stats = [
        {
            label: "Total Products",
            value: totalProducts,
            icon: Package,
            color: "from-orange-500 to-amber-600",
            shadow: "shadow-orange-500/30",
        },
        {
            label: "Pending Reviews",
            value: pendingContributions,
            icon: Clock,
            color: "from-amber-500 to-orange-500",
            shadow: "shadow-amber-500/30",
        },
        {
            label: "Approved",
            value: approvedContributions,
            icon: CheckCircle,
            color: "from-green-500 to-emerald-600",
            shadow: "shadow-green-500/30",
        },
        {
            label: "Total Users",
            value: totalUsers,
            icon: Users,
            color: "from-blue-500 to-indigo-600",
            shadow: "shadow-blue-500/30",
        },
    ];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg ${stat.shadow}`}
                            >
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                                    {stat.value}
                                </p>
                                <p className="text-sm text-neutral-500">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pending Contributions */}
            {pendingContributions > 0 && (
                <Card className="mt-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Pending Contributions</CardTitle>
                            <CardDescription>
                                {pendingContributions} contributions awaiting review
                            </CardDescription>
                        </div>
                        <Link href="/admin/contributions">
                            <Button className="gap-2">
                                Review All
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                </Card>
            )}

            {/* Recent Activity */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest contributions from users</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentContributions.length === 0 ? (
                        <p className="text-sm text-neutral-500">No contributions yet</p>
                    ) : (
                        <div className="space-y-4">
                            {recentContributions.map((contribution) => (
                                <div
                                    key={contribution.id}
                                    className="flex items-center justify-between rounded-lg border border-neutral-100 p-4 dark:border-neutral-800"
                                >
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                            {contribution.product.name}
                                        </p>
                                        <p className="text-sm text-neutral-500">
                                            by {contribution.user.name || contribution.user.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${contribution.status === "PENDING"
                                                ? "bg-amber-100 text-amber-700"
                                                : contribution.status === "APPROVED"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {contribution.status}
                                        </span>
                                        <span className="text-xs text-neutral-400">
                                            {contribution.createdAt.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
