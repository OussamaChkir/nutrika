"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "fr" : "en";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale} className="w-12 h-8 font-medium">
      {locale === "en" ? "FR" : "EN"}
    </Button>
  );
}
