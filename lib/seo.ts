import { Metadata } from 'next'
import { routing } from '@/i18n/routing'

interface MetadataProps {
  title?: string
  description?: string
  image?: string
  noIndex?: boolean
  locale?: string
  path?: string
}

export function constructMetadata({
  title = "Nutrika - Know What You Eat",
  description = "Scan product barcodes to discover nutritional scores, health insights, and allergen warnings. Make informed food choices with Nutrika.",
  image = "/favicon.ico",
  noIndex = false,
  locale = "en",
  path = "/",
}: MetadataProps = {}): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nutrika.app'
  const normalizedPath = path === '/' ? '' : path
  const currentUrl = `${baseUrl}/${locale}${normalizedPath}`
  
  const languages: Record<string, string> = {}
  routing.locales.forEach((l) => {
    languages[l] = `${baseUrl}/${l}${normalizedPath}`
  })
  
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale,
      url: currentUrl,
      title,
      description,
      siteName: "Nutrika",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: currentUrl,
      languages,
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false
      }
    })
  }
}
