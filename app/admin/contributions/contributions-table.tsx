"use client";

import { useState } from "react";
import Image from "next/image";
import { approveContribution, rejectContribution } from "../actions";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, Loader2 } from "lucide-react";

interface Contribution {
    id: string;
    changes: unknown;
    reason: string | null;
    createdAt: Date;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
    product: {
        id: string;
        barcode: string;
        name: string;
        imageUrl: string | null;
    };
}

interface ContributionsTableProps {
    contributions: Contribution[];
}

export function ContributionsTable({ contributions }: ContributionsTableProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [items, setItems] = useState(contributions);

    const handleApprove = async (id: string) => {
        setLoadingId(id);
        const result = await approveContribution(id);
        if (result.success) {
            setItems((prev) => prev.filter((c) => c.id !== id));
        }
        setLoadingId(null);
    };

    const handleReject = async (id: string) => {
        setLoadingId(id);
        const result = await rejectContribution(id);
        if (result.success) {
            setItems((prev) => prev.filter((c) => c.id !== id));
        }
        setLoadingId(null);
    };

    if (items.length === 0) {
        return (
            <div className="py-12 text-center">
                <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                    All caught up!
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                    No pending contributions to review
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">
                            Product
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">
                            Submitted By
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">
                            Date
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-neutral-500">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((contribution) => (
                        <tr
                            key={contribution.id}
                            className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                        >
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                        {contribution.product.imageUrl ? (
                                            <Image
                                                src={contribution.product.imageUrl}
                                                alt={contribution.product.name}
                                                fill
                                                className="object-contain p-1"
                                                sizes="40px"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-lg">
                                                📦
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                            {contribution.product.name}
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            {contribution.product.barcode}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4">
                                <p className="text-neutral-900 dark:text-neutral-100">
                                    {contribution.user.name || contribution.user.email}
                                </p>
                            </td>
                            <td className="px-4 py-4 text-neutral-500">
                                {contribution.createdAt.toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1"
                                        onClick={() =>
                                            window.open(`/product/${contribution.product.barcode}`, "_blank")
                                        }
                                    >
                                        <Eye className="h-3 w-3" />
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                                        onClick={() => handleApprove(contribution.id)}
                                        disabled={loadingId === contribution.id}
                                    >
                                        {loadingId === contribution.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Check className="h-3 w-3" />
                                        )}
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleReject(contribution.id)}
                                        disabled={loadingId === contribution.id}
                                    >
                                        {loadingId === contribution.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <X className="h-3 w-3" />
                                        )}
                                        Reject
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
