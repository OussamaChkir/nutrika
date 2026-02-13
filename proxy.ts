import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const isAdmin = req.auth?.user?.role === "ADMIN";

    // Protected routes that require authentication
    const protectedRoutes = ["/add-product", "/profile"];

    // Admin-only routes
    const adminRoutes = ["/admin"];

    const isProtectedRoute = protectedRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
    );

    const isAdminRoute = adminRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
    );

    const isAuthRoute =
        nextUrl.pathname.startsWith("/sign-in") ||
        nextUrl.pathname.startsWith("/sign-up");

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

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Match all routes except static files and API routes
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
    ],
};
