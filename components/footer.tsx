import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                    {/* Logo and tagline */}
                    <div className="flex flex-col items-center gap-1 md:items-start">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                                <span className="text-sm font-bold text-white">N</span>
                            </div>
                            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                Nutrika
                            </span>
                        </div>
                        <p className="text-sm text-neutral-500">
                            Know what you eat.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
                        <Link
                            href="/about"
                            className="hover:text-emerald-600 transition-colors"
                        >
                            About
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-emerald-600 transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms"
                            className="hover:text-emerald-600 transition-colors"
                        >
                            Terms
                        </Link>
                        <a
                            href="https://world.openfoodfacts.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-emerald-600 transition-colors"
                        >
                            Open Food Facts
                        </a>
                    </div>

                    {/* Social links */}
                    <div className="flex gap-4">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-neutral-600 transition-colors dark:hover:text-neutral-300"
                        >
                            <Github className="h-5 w-5" />
                        </a>
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-neutral-600 transition-colors dark:hover:text-neutral-300"
                        >
                            <Twitter className="h-5 w-5" />
                        </a>
                    </div>
                </div>

                <div className="mt-6 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
                    <p>
                        © {new Date().getFullYear()} Nutrika. Product data from{" "}
                        <a
                            href="https://world.openfoodfacts.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline"
                        >
                            Open Food Facts
                        </a>
                        .
                    </p>
                </div>
            </div>
        </footer>
    );
}
