import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { auth } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Nutrika - Know What You Eat",
    template: "%s | Nutrika",
  },
  description:
    "Scan product barcodes to discover nutritional scores, health insights, and allergen warnings. Make informed food choices with Nutrika.",
  keywords: [
    "food scanner",
    "nutrition",
    "barcode scanner",
    "health",
    "food analysis",
    "allergens",
    "yuka alternative",
  ],
  authors: [{ name: "Nutrika" }],
  creator: "Nutrika",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nutrika.app",
    title: "Nutrika - Know What You Eat",
    description: "Scan product barcodes to discover nutritional insights",
    siteName: "Nutrika",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nutrika - Know What You Eat",
    description: "Scan product barcodes to discover nutritional insights",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-gradient-to-br from-neutral-50 via-white to-orange-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/20">
        <Header user={session?.user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
