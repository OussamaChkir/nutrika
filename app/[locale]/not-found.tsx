import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Scan } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <span className="text-5xl">🔍</span>
            </div>

            <h1 className="mt-8 text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                Page Not Found
            </h1>

            <p className="mt-4 max-w-md text-neutral-600 dark:text-neutral-400">
                Sorry, we couldn't find the page you're looking for. It might have been
                moved or doesn't exist.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/">
                    <Button size="lg" className="gap-2">
                        <Home className="h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
                <Link href="/scan">
                    <Button size="lg" variant="outline" className="gap-2">
                        <Scan className="h-4 w-4" />
                        Scan a Product
                    </Button>
                </Link>
            </div>
        </div>
    );
}
