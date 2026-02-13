"use client";

import { useState } from "react";
import { UserRole } from "@prisma/client";
import { promoteUser } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: UserRole;
    createdAt: Date;
}

export function UsersTable({ initialUsers }: { initialUsers: User[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const filteredUsers = users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        setIsUpdating(userId);
        try {
            const result = await promoteUser(userId, newRole as "USER" | "ADMIN" | "PREMIUM");

            if (result.success) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
                // alert("User role updated");
            } else {
                alert("Failed to update role: " + result.error);
            }
        } catch (error) {
            console.error("Failed to update role", error);
            alert("An error occurred");
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <Search className="h-4 w-4 text-neutral-500" />
                <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-none bg-transparent p-0 focus-visible:ring-0"
                />
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                        <tr>
                            <th className="px-4 py-3 font-medium text-neutral-500">User</th>
                            <th className="px-4 py-3 font-medium text-neutral-500">Role</th>
                            <th className="px-4 py-3 font-medium text-neutral-500">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.image || ""} />
                                            <AvatarFallback>{user.name?.[0] || user.email[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                                {user.name || "No name"}
                                            </div>
                                            <div className="text-sm text-neutral-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="relative">
                                        <select
                                            disabled={isUpdating === user.id}
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                            className="h-9 rounded-md border border-neutral-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:border-neutral-400 focus:outline-none disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-200"
                                        >
                                            <option value="USER">User</option>
                                            <option value="PREMIUM">Premium</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                        {isUpdating === user.id && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-neutral-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-sm text-neutral-500">
                Showing {filteredUsers.length} users
            </div>
        </div>
    );
}
