import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return constructMetadata({
        title: "Search Products",
        description: "Search for products by name, brand, or barcode to discover nutritional insights.",
        locale,
        path: "/search"
    });
}

export default function SearchLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
