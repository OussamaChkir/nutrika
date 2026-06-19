"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, SignUpInput } from "@/lib/validators";
import { signUpAction, signInWithGoogle } from "@/lib/auth-actions";
import { Loader2, User, Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
    if (!password || password.length < 4) return "weak";
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return "weak";
    if (score <= 3) return "medium";
    return "strong";
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; gradient: string; width: string }> = {
    weak: {
        label: "Weak Password",
        color: "text-red-500",
        gradient: "from-red-400 to-red-500",
        width: "w-1/3",
    },
    medium: {
        label: "Medium Password",
        color: "text-amber-500",
        gradient: "from-amber-400 to-orange-400",
        width: "w-2/3",
    },
    strong: {
        label: "Strong Password",
        color: "text-emerald-500",
        gradient: "from-emerald-400 to-teal-500",
        width: "w-full",
    },
};

export default function SignUpPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignUpInput>({
        resolver: zodResolver(signUpSchema),
    });

    const watchPassword = watch("password", "");
    const watchEmail = watch("email", "");

    const strength = useMemo(() => getPasswordStrength(watchPassword), [watchPassword]);
    const cfg = strengthConfig[strength];

    const isEmailValid = useMemo(() => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchEmail);
    }, [watchEmail]);

    const onSubmit = useCallback(async (data: SignUpInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await signUpAction(data);

            if (!result.success) {
                setError(result.error || "Failed to create account");
                setIsLoading(false);
                return;
            }

            router.push("/sign-in?registered=true");
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    }, [router]);

    return (
        <div className="w-full animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
                    Join{" "}
                    <span className="bg-gradient-to-r from-orange-500 to-[#fc686f] bg-clip-text text-transparent">
                        Nutrika
                    </span>
                </h1>
                <p className="text-gray-400 mt-1.5 text-[15px]">
                    Discover what&apos;s really in your food.
                </p>
            </div>

            {/* Google Sign Up */}
            <form action={signInWithGoogle}>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-2xl bg-white hover:bg-gray-50/80 hover:border-gray-300 transition-all duration-200 text-[15px] font-medium text-gray-700 shadow-sm cursor-pointer disabled:opacity-50"
                >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-[#fafafa] px-4 text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
                        or continue with
                    </span>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Step 1 of 1
                </span>
                <div className="h-1.5 w-24 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-orange-400 to-[#fc686f] transition-all duration-500" />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <div>
                    <label
                        htmlFor="signup-name"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2"
                    >
                        Full Name
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <User className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="signup-name"
                            type="text"
                            placeholder="Enter your full name"
                            autoComplete="name"
                            disabled={isLoading}
                            {...register("name")}
                            className="w-full rounded-2xl border-0 bg-gray-100/80 py-3.5 pl-11 pr-4 text-[15px] text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-orange-300/60 focus:shadow-lg focus:shadow-orange-100/50 disabled:opacity-50"
                        />
                    </div>
                    {errors.name && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
                    )}
                </div>

                {/* Email Address */}
                <div>
                    <label
                        htmlFor="signup-email"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2"
                    >
                        Email Address
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Mail className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="signup-email"
                            type="email"
                            placeholder="yourname@email.com"
                            autoComplete="email"
                            disabled={isLoading}
                            {...register("email")}
                            className="w-full rounded-2xl border-0 bg-gray-100/80 py-3.5 pl-11 pr-11 text-[15px] text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-orange-300/60 focus:shadow-lg focus:shadow-orange-100/50 disabled:opacity-50"
                        />
                        {/* Email validation check */}
                        {isEmailValid && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 animate-fade-in-up">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        )}
                    </div>
                    {errors.email && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label
                        htmlFor="signup-password"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Lock className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...register("password")}
                            className="w-full rounded-2xl border-0 bg-gray-100/80 py-3.5 pl-11 pr-12 text-[15px] text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-orange-300/60 focus:shadow-lg focus:shadow-orange-100/50 disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="h-[18px] w-[18px]" />
                            ) : (
                                <Eye className="h-[18px] w-[18px]" />
                            )}
                        </button>
                    </div>
                    {/* Password strength indicator */}
                    {watchPassword && (
                        <div className="mt-2.5 space-y-1.5">
                            <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-500 ease-out ${cfg.width}`}
                                />
                            </div>
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {cfg.label}
                            </div>
                        </div>
                    )}
                    {errors.password && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label
                        htmlFor="signup-confirm-password"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2"
                    >
                        Confirm Password
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Lock className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="signup-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repeat password"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...register("confirmPassword")}
                            className="w-full rounded-2xl border-0 bg-gray-100/80 py-3.5 pl-11 pr-12 text-[15px] text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-orange-300/60 focus:shadow-lg focus:shadow-orange-100/50 disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-[18px] w-[18px]" />
                            ) : (
                                <Eye className="h-[18px] w-[18px]" />
                            )}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword.message}</p>
                    )}
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer select-none group pt-1">
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="h-[18px] w-[18px] rounded-md border-2 border-gray-300 bg-white transition-all peer-checked:border-orange-400 peer-checked:bg-orange-400 group-hover:border-gray-400 shrink-0" />
                        <svg
                            className="absolute top-0.5 left-0.5 h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                            viewBox="0 0 14 14"
                            fill="none"
                        >
                            <path
                                d="M3 7l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <span className="text-[13px] text-gray-500 leading-snug">
                        I agree to the{" "}
                        <Link href="/terms" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                            Privacy Policy
                        </Link>
                        .
                    </span>
                </label>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading || !agreedToTerms}
                    className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-[#fc686f] py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-orange-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-orange-400/40 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}
                    </span>
                </button>
            </form>

            {/* Footer */}
            <p className="mt-8 text-center text-[14px] text-gray-500">
                Already have an account?{" "}
                <Link
                    href="/sign-in"
                    className="font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}
