import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/seo";
import { ProductsTable } from "./products-table";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return constructMetadata({
        title: "Admin - Products",
        description: "Manage products",
        locale,
        path: "/admin/products"
    });
}

export default async function AdminProductsPage() {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            createdBy: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    Products
                </h1>
                <p className="text-neutral-500">
                    Manage product database ({products.length} total)
                </p>
            </div>

            <ProductsTable initialProducts={products} />
        </div>
    );
}
