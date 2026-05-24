import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Facebook, Instagram } from "lucide-react";

export function Footer() {
    const t = useTranslations('Footer');

    return (
        <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
                    {/* Logo and tagline */}
                    <div className="flex flex-col items-center gap-1 md:items-start">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orangina-300">
                                <span className="text-sm font-bold text-white">N</span>
                            </div>
                            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                Nutrika
                            </span>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
                        <Link
                            href="/about"
                            className="hover:text-orange-600 transition-colors"
                        >
                            {t('about')}
                        </Link>
                        <Link
                            href="/privacy"
                            className="hover:text-orange-600 transition-colors"
                        >
                            {t('privacy')}
                        </Link>
                        <Link
                            href="/terms"
                            className="hover:text-orange-600 transition-colors"
                        >
                            {t('terms')}
                        </Link>
                    </div>

                    {/* Social links */}
                    <div className="flex gap-4">
                        <a
                            href="https://www.facebook.com/profile.php?id=61590411448444"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-neutral-600 transition-colors dark:hover:text-neutral-300"
                        >
                            <Facebook className="h-5 w-5" />
                        </a>
                        <a
                            href="https://www.instagram.com/nutrikapp/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-neutral-600 transition-colors dark:hover:text-neutral-300"
                        >
                            <Instagram className="h-5 w-5" />
                        </a>
                    </div>
                </div>

                <div className="mt-6 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
                    <p>
                        © {new Date().getFullYear()} <Link
                            href="/"
                            className="text-orange-600 hover:underline transition-colors"
                        >Nutrika</Link>. {t('allRightsReserved')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
