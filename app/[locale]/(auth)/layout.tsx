"use client";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fafafa] px-4 py-12">
            {/* Subtle decorative gradient orbs */}
            <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-orange-200/40 to-pink-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-tr from-orange-100/30 to-amber-100/20 blur-3xl" />

            <div className="relative z-10 w-full max-w-[420px]">
                {children}
            </div>
        </div>
    );
}
