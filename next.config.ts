import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
// @ts-ignore — next-pwa has no bundled types
import withPWAInit from 'next-pwa';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Same "on" values as lib/flags.ts. Read at build time, like every NEXT_PUBLIC_ flag.
const offlineModeOn = ['1', 'true', 'on', 'yes'].includes((process.env.NEXT_PUBLIC_FF_OFFLINE_MODE ?? '').trim().toLowerCase());

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable SW in development so hot-reload works normally
  disable: process.env.NODE_ENV === 'development',
  // Show /offline page when a navigation request fails while offline
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    // Cache-first for static assets (images, fonts, JS bundles)
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Stale-while-revalidate for Next.js static chunks
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // API responses are never kept by the service worker: they can hold personal data (profile,
    // history, account export). Offline product data lives in IndexedDB instead (F8).
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkOnly',
    },
    // With offline mode on, product pages are never cached: they contain the personal verdict.
    // When there is no connection the offline screen rebuilds the verdict from IndexedDB (F8).
    // (The build flag is read here; a function rule cannot see variables from this file.)
    ...(offlineModeOn
      ? [{ urlPattern: /^https?:\/\/[^/]+\/(?:(?:en|fr)\/)?product(?:\/|$)/i, handler: 'NetworkOnly' }]
      : []),
    // Stale-while-revalidate for public page navigations. Pages that show a signed-in user's own
    // data are NOT kept, so someone else using the same device cannot open them from the cache.
    // (With offline mode on, product pages are excluded by the rule just above.)
    {
      urlPattern: ({ url }: { url: URL }) => {
        if (url.origin !== self.location.origin) return false;
        const path = url.pathname.replace(/^\/(?:en|fr)(?=\/|$)/, '');
        if (/^\/(?:api|profile|shopping|insights|admin|add-product|search|sign-in|sign-up|favorites|scan\/label)(?:\/|$)/.test(path)) return false;
        return true;
      },
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages',
        expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.openfoodfacts.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "world.openfoodfacts.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "blognutrikafood.kesug.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default withPWA(withNextIntl(nextConfig));

