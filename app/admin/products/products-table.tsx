"use client";

import { useState } from "react";
import { ProductStatus } from "@prisma/client";
import { approveProduct, rejectProduct, deleteProduct } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Loader2, CheckCircle, XCircle, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    status: ProductStatus;
    createdBy: { name: string | null; email: string } | null;
    createdAt: Date;
}

export function ProductsTable({ initialProducts }: { initialProducts: Product[] }) {
    const router = useRouter();
    const [products, setProducts] = useState(initialProducts);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | ProductStatus>("ALL");
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode.includes(searchQuery) ||
            (product.brand?.toLowerCase() || "").includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || product.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleAction = async (productId: string, action: "approve" | "reject" | "delete") => {
        if (!confirm(`Are you sure you want to ${action} this product?`)) return;

        setIsUpdating(productId);
        try {
            let result;
            if (action === "approve") result = await approveProduct(productId);
            else if (action === "reject") result = await rejectProduct(productId);
            else result = await deleteProduct(productId);

            if (result.success) {
                if (action === "delete") {
                    setProducts(products.filter(p => p.id !== productId));
                } else {
                    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
                    setProducts(products.map(p => p.id === productId ? { ...p, status: newStatus as ProductStatus } : p));
                }
                router.refresh(); // Refresh server data too
            } else {
                alert(`Failed to ${action} product: ` + result.error);
            }
        } catch (error) {
            console.error(`Failed to ${action} product`, error);
            alert("An error occurred");
        } finally {
            setIsUpdating(null);
        }
    };

    const getStatusColor = (status: ProductStatus) => {
        switch (status) {
            case "APPROVED": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "PENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            case "REJECTED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            default: return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400";
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 max-w-sm">
                    <Search className="h-4 w-4 text-neutral-500" />
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-none bg-transparent p-0 focus-visible:ring-0"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                    {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === status
                                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                                }`}
                        >
                            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                            <tr>
                                <th className="px-4 py-3 font-medium text-neutral-500">Product</th>
                                <th className="px-4 py-3 font-medium text-neutral-500">Status</th>
                                <th className="px-4 py-3 font-medium text-neutral-500">Submitted By</th>
                                <th className="px-4 py-3 font-medium text-neutral-500">Date</th>
                                <th className="px-4 py-3 font-medium text-neutral-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {product.imageUrl && (
                                                <img
                                                    src={product.imageUrl}
                                                    alt=""
                                                    className="h-10 w-10 rounded-md object-contain bg-neutral-50"
                                                />
                                            )}
                                            <div>
                                                <div className="font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
                                                    {product.name}
                                                </div>
                                                <div className="text-xs text-neutral-500">{product.brand}</div>
                                                <div className="text-xs text-neutral-400 font-mono">{product.barcode}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(product.status)}`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {product.createdBy ? (
                                            <div>
                                                <div className="text-neutral-900 dark:text-neutral-100">
                                                    {product.createdBy.name || "Unknown"}
                                                </div>
                                                <div className="text-xs text-neutral-500">{product.createdBy.email}</div>
                                            </div>
                                        ) : (
                                            <span className="text-neutral-400 italic">System / OFF</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-neutral-500">
                                        {new Date(product.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/product/${product.barcode}`} target="_blank">
                                                <button className="rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" title="View Product">
                                                    <ExternalLink className="h-4 w-4 text-neutral-500" />
                                                </button>
                                            </Link>

                                            {product.status === "PENDING" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(product.id, "approve")}
                                                        disabled={isUpdating === product.id}
                                                        className="rounded-md p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        title="Approve"
                                                    >
                                                        {isUpdating === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(product.id, "reject")}
                                                        disabled={isUpdating === product.id}
                                                        className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Reject"
                                                    >
                                                        {isUpdating === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                    </button>
                                                </>
                                            )}

                                            {product.status !== "PENDING" && (
                                                <button
                                                    onClick={() => handleAction(product.id, "delete")}
                                                    disabled={isUpdating === product.id}
                                                    className="rounded-md p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                    title="Delete"
                                                >
                                                    {isUpdating === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="text-sm text-neutral-500">
                Showing {filteredProducts.length} products
            </div>
        </div>
    );
}
