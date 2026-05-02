import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Shield } from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Admin Header */}
            <div className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mx-auto max-w-7xl px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                Admin Panel
                            </h1>
                            <p className="text-sm text-neutral-500">
                                Manage products and contributions
                            </p>
                        </div>
                    </div>

                    {/* Admin Nav */}
                    <nav className="mt-4 flex gap-4">
                        <Link
                            href="/admin"
                            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/admin/users"
                            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            Users
                        </Link>
                        <Link
                            href="/admin/products"
                            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            Products
                        </Link>
                        <Link
                            href="/admin/contributions"
                            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            Contributions
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
