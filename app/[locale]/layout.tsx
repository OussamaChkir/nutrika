import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { auth } from "@/lib/auth";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { CompareProvider } from "@/components/compare-context";
import { JsonLd } from "@/components/json-ld";
import { AlternateLinks } from "@/components/alternate-links";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "NutrikaFood | Smart Food Barcode Scanner & Nutrition Tracker",
    template: "%s | NutrikaFood",
  },
  description:
    "Scan any food barcode to instantly see nutrition facts, health scores, and allergen alerts. Make healthier eating choices with NutrikaFood’s data-driven insights.",
  keywords: [
    "food barcode scanner",
    "nutrition scanner app",
    "allergen scanner",
    "food allergy app",
    "healthy eating app",
    "food score app",
    "ingredient checker",
    "clean eating scanner",
    "gluten-free scanner",
    "lactose-free scanner",
    "diet tracker app",
    "nutrition facts scanner",
    "yuka alternative",
    "food transparency",
    "health and wellness app",
    "smart grocery shopping",
    "personalized nutrition",
    "allergen alerts",
    "food ingredient analysis"
  ],
  authors: [{ name: "Nutrika" }],
  creator: "Nutrika",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nutrikafood.com'),
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nutrikafood.com",
    title: "NutrikaFood | Smart Food Barcode Scanner & Nutrition Tracker",
    description: "Scan any food barcode to instantly see nutrition facts, health scores, and allergen alerts. Make healthier eating choices with NutrikaFood’s data-driven insights.",
    siteName: "NutrikaFood",
  },
  twitter: {
    card: "summary_large_image",
    title: "NutrikaFood | Smart Food Barcode Scanner & Nutrition Tracker",
    description: "Scan any food barcode to instantly see nutrition facts, health scores, and allergen alerts. Make healthier eating choices with NutrikaFood’s data-driven insights.",
  },
  appleWebApp: {
    title: "NutrikaFood",
    statusBarStyle: "default",
    capable: true,
  },
  verification: {
    google: "3hKt4OQkxggZ_bl37_4Abm1ccVHW0UCrR2Ub2auNpNY",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const session = await auth();
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-gradient-to-br from-neutral-50 via-white to-orange-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/20">
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "NutrikaFood",
              url: "https://nutrikafood.com",
              logo: "https://nutrikafood.com/icon.png",
              description: "Nutrika helps you scan product barcodes to discover nutritional scores, health insights, and allergen warnings.",
            },
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "NutrikaFood",
              url: "https://nutrikafood.com",
              applicationCategory: "HealthAndFitnessApplication",
              operatingSystem: "Any",
              description: "Scan product barcodes to discover nutritional scores, health insights, and allergen warnings.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD"
              }
            }
          ]}
        />
        <NextIntlClientProvider messages={messages}>
          <AlternateLinks />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CompareProvider>
              <Header user={session?.user} />
              <main className="flex-1">{children}</main>
              <Footer />
            </CompareProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <PWAInstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
