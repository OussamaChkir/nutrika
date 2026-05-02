import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const isAdmin = req.auth?.user?.role === "ADMIN";

    // Protected routes that require authentication
    const protectedRoutes = ["/add-product", "/profile"];

    // Admin-only routes
    const adminRoutes = ["/admin"];

    // Strip locale prefix for route matching
    const pathnameWithoutLocale = nextUrl.pathname.replace(/^\/(en|fr)/, "") || "/";

    const isProtectedRoute = protectedRoutes.some((route) =>
        pathnameWithoutLocale.startsWith(route)
    );

    const isAdminRoute = adminRoutes.some((route) =>
        pathnameWithoutLocale.startsWith(route)
    );

    const isAuthRoute =
        pathnameWithoutLocale.startsWith("/sign-in") ||
        pathnameWithoutLocale.startsWith("/sign-up");

    // Redirect logged-in users away from auth pages
    if (isAuthRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/", nextUrl));
    }

    // Redirect to sign-in if accessing protected routes while not logged in
    if (isProtectedRoute && !isLoggedIn) {
        const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
        return NextResponse.redirect(
            new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl)
        );
    }

    // Redirect non-admins away from admin routes
    if (isAdminRoute && !isAdmin) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/sign-in", nextUrl));
        }
        return NextResponse.redirect(new URL("/", nextUrl));
    }

    // Defer to next-intl middleware for all other requests
    return intlMiddleware(req);
});

export const config = {
    matcher: [
        // Match all routes except static files and API routes
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
    ],
};
