import { prisma } from "@/lib/db";
import { ContributionsTable } from "./contributions-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContributionsPage() {
    const contributions = await prisma.contribution.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { id: true, name: true, email: true } },
            product: { select: { id: true, barcode: true, name: true, imageUrl: true } },
        },
    });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Pending Contributions</CardTitle>
                    <CardDescription>
                        Review and approve user-submitted product updates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {contributions.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                                All caught up!
                            </p>
                            <p className="mt-1 text-sm text-neutral-500">
                                No pending contributions to review
                            </p>
                        </div>
                    ) : (
                        <ContributionsTable contributions={contributions} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
