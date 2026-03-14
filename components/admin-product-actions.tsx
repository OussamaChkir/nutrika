"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductStatus } from "@prisma/client";
import { approveProduct, rejectProduct, deleteProduct } from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Trash2, Loader2, ShieldAlert } from "lucide-react";

interface AdminProductActionsProps {
    productId: string;
    currentStatus: ProductStatus;
}

export function AdminProductActions({ productId, currentStatus }: AdminProductActionsProps) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleAction = async (action: "approve" | "reject" | "delete") => {
        if (!confirm(`Are you sure you want to ${action} this product?`)) return;

        setIsUpdating(true);
        try {
            let result;
            if (action === "approve") result = await approveProduct(productId);
            else if (action === "reject") result = await rejectProduct(productId);
            else result = await deleteProduct(productId);

            if (result.success) {
                if (action === "delete") {
                    router.push("/admin/products");
                } else {
                    router.refresh();
                }
            } else {
                alert(`Failed to ${action} product: ` + result?.error);
            }
        } catch (error) {
            console.error(`Failed to ${action} product`, error);
            alert("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card className="animate-fade-in-up delay-600 border-rose-200 bg-rose-50/50 shadow-md dark:border-rose-900/30 dark:bg-rose-900/10">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                    <ShieldAlert className="h-5 w-5 text-rose-500" />
                    Admin Actions
                </CardTitle>
                <CardDescription className="text-rose-700/70 dark:text-rose-300/70">
                    Current Status: <span className="font-semibold text-rose-800 dark:text-rose-200">{currentStatus}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3">
                    {currentStatus !== "APPROVED" && (
                        <Button
                            onClick={() => handleAction("approve")}
                            disabled={isUpdating}
                            variant="outline"
                            className="flex-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
                        >
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Approve
                        </Button>
                    )}

                    {currentStatus !== "REJECTED" && (
                        <Button
                            onClick={() => handleAction("reject")}
                            disabled={isUpdating}
                            variant="outline"
                            className="flex-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                        >
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Reject
                        </Button>
                    )}

                    <Button
                        onClick={() => handleAction("delete")}
                        disabled={isUpdating}
                        variant="destructive"
                        className="flex-1"
                    >
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
