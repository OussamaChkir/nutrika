"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validators";
import { requestPasswordResetAction } from "@/lib/auth-actions";
import { Loader2, Mail, MailCheck, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const locale = useLocale();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await requestPasswordResetAction(data.email, locale);

            if (!result.success) {
                setError(result.error || "Something went wrong. Please try again.");
                setIsLoading(false);
                return;
            }

            setSentTo(data.email);
        } catch {
            setError("Something went wrong. Please try again.");
        }
        setIsLoading(false);
    };

    if (sentTo) {
        return (
            <div className="w-full animate-fade-in-up text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10">
                    <MailCheck className="h-7 w-7 text-orange-500" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Check your email
                </h1>
                <p className="text-gray-400 dark:text-gray-500 mt-2 text-[15px]">
                    If an account exists for <span className="font-medium text-gray-600 dark:text-gray-300">{sentTo}</span>,
                    we&apos;ve sent a link to reset your password. It works for 60 minutes.
                </p>
                <p className="mt-3 text-[13px] text-gray-400 dark:text-gray-500">
                    Nothing arrived? Check your spam folder, or wait a minute and try again.
                </p>
                <Link
                    href="/sign-in"
                    className="mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full animate-fade-in-up">
            <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Forgot your password?
                </h1>
                <p className="text-gray-400 dark:text-gray-500 mt-1.5 text-[15px]">
                    Enter your email and we&apos;ll send you a reset link
                </p>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <label
                        htmlFor="forgot-email"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2"
                    >
                        Email Address
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Mail className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="forgot-email"
                            type="email"
                            placeholder="yourname@email.com"
                            autoComplete="email"
                            disabled={isLoading}
                            {...register("email")}
                            className="w-full rounded-2xl border-0 bg-gray-100/80 dark:bg-neutral-900 py-3.5 pl-11 pr-4 text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-orange-300/60 dark:focus:ring-orange-500/30 focus:shadow-lg focus:shadow-orange-100/50 dark:focus:shadow-none disabled:opacity-50"
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-[#fc686f] py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-orange-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-orange-400/40 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            "Send reset link"
                        )}
                    </span>
                </button>
            </form>

            <p className="mt-8 text-center text-[14px] text-gray-500">
                <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                </Link>
            </p>
        </div>
    );
}
