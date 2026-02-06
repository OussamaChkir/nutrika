import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Scan, Home } from "lucide-react";

export default function ProductNotFound() {
    return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <span className="text-4xl">🔍</span>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Product Not Found
            </h1>

            <p className="mt-3 text-neutral-600 dark:text-neutral-400">
                We couldn't find this product in our database or Open Food Facts.
                Would you like to add it?
            </p>

            <div className="mt-8 flex flex-col gap-3">
                <Link href="/add-product">
                    <Button className="w-full gap-2">
                        Add This Product
                    </Button>
                </Link>

                <Link href="/scan">
                    <Button variant="outline" className="w-full gap-2">
                        <Scan className="h-4 w-4" />
                        Scan Another Product
                    </Button>
                </Link>

                <Link href="/">
                    <Button variant="ghost" className="w-full gap-2">
                        <Home className="h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        </div>
    );
}
