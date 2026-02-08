"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Scan,
    Home,
    PlusCircle,
    User,
    LogOut,
    Settings,
    Shield,
    Menu,
    X,
    Search,
} from "lucide-react";
import { useState } from "react";
import { signOutAction } from "@/lib/auth-actions";

interface HeaderProps {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: string;
    } | null;
}

export function Header({ user }: HeaderProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isAdmin = user?.role === "ADMIN";

    const navItems = [
        { href: "/", label: "Home", icon: Home },
        { href: "/search", label: "Search", icon: Search },
        { href: "/scan", label: "Scan", icon: Scan },
        ...(user ? [{ href: "/add-product", label: "Add Product", icon: PlusCircle }] : []),
        ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    ];

    const getInitials = (name?: string | null, email?: string | null) => {
        if (name) {
            return name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        return email?.slice(0, 2).toUpperCase() || "U";
    };

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orangina-300 shadow-lg shadow-orange-400/30">
                        <span className="text-lg font-bold text-white">N</span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orangina-300 bg-clip-text text-transparent">
                        Nutrika
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`gap-2 ${isActive ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : ""}`}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Menu / Auth Buttons */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <div className="hidden md:flex items-center gap-2">
                            <Link href="/profile">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.image || undefined} />
                                        <AvatarFallback className="text-xs">
                                            {getInitials(user.name, user.email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="max-w-[100px] truncate">{user.name || user.email}</span>
                                </Button>
                            </Link>
                            <form action={signOutAction}>
                                <Button type="submit" variant="ghost" size="icon">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2">
                            <Link href="/sign-in">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/sign-up">
                                <Button size="sm">Sign Up</Button>
                            </Link>
                        </div>
                    )}

                    {/* Mobile menu button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="border-t border-neutral-200/80 bg-white/95 backdrop-blur-xl md:hidden dark:border-neutral-800/80 dark:bg-neutral-950/95">
                    <nav className="flex flex-col p-4 gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={`w-full justify-start gap-3 ${isActive ? "bg-orange-100 text-orange-700" : ""}`}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}

                        <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />

                        {user ? (
                            <>
                                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start gap-3">
                                        <User className="h-5 w-5" />
                                        Profile
                                    </Button>
                                </Link>
                                <form action={signOutAction}>
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        className="w-full justify-start gap-3 text-red-600"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Sign Out
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <>
                                <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start gap-3">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full justify-start gap-3">
                                        Sign Up
                                    </Button>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
