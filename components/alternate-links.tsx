"use client";

import { usePathname } from '@/i18n/routing';

export function AlternateLinks() {
  const pathname = usePathname();
  
  const basePath = 'https://nutrikafood.com';
  const path = pathname === '/' ? '' : pathname;
  
  return (
    <>
      <link rel="alternate" hrefLang="en" href={`${basePath}/en${path}`} />
      <link rel="alternate" hrefLang="fr" href={`${basePath}/fr${path}`} />
      <link rel="alternate" hrefLang="x-default" href={`${basePath}/en${path}`} />
    </>
  );
}
