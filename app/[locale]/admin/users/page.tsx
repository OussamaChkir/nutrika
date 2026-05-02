import { prisma } from "@/lib/db";
import { UsersTable } from "./users-table";

export const metadata = {
    title: "Admin - Users",
    description: "Manage users and roles",
};

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
        },
    });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Users
                </h1>
                <p className="text-neutral-500">
                    Manage accounts and roles ({users.length} total)
                </p>
            </div>

            <UsersTable initialUsers={users} />
        </div>
    );
}
