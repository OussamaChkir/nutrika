"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validators";
import { resetPasswordAction } from "@/lib/auth-actions";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const inputClass =
    "w-full rounded-2xl border-0 bg-gray-100/80 dark:bg-neutral-900 py-3.5 pl-11 pr-12 text-[15px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:bg-white dark:focus:bg-neutral-950 focus:ring-2 focus:ring-orange-300/60 dark:focus:ring-orange-500/30 focus:shadow-lg focus:shadow-orange-100/50 dark:focus:shadow-none disabled:opacity-50";

const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2";

export function ResetPasswordForm({ token }: { token: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { token },
    });

    const onSubmit = async (data: ResetPasswordInput) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await resetPasswordAction(token, data.password, data.confirmPassword);

            if (!result.success) {
                setError(result.error || "Something went wrong. Please try again.");
                setIsLoading(false);
                return;
            }

            setDone(true);
        } catch {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    if (done) {
        return (
            <div className="w-full animate-fade-in-up text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Password updated
                </h1>
                <p className="text-gray-400 dark:text-gray-500 mt-2 text-[15px]">
                    You can now sign in with your new password.
                </p>
                <Link
                    href="/sign-in"
                    className="mt-8 inline-block w-full rounded-2xl bg-gradient-to-r from-orange-400 via-orange-500 to-[#fc686f] py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-orange-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-orange-400/40 hover:brightness-105"
                >
                    Go to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full animate-fade-in-up">
            <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Choose a new password
                </h1>
                <p className="text-gray-400 dark:text-gray-500 mt-1.5 text-[15px]">
                    At least 8 characters, with upper and lower case letters and a number
                </p>
            </div>

            {error && (
                <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                    {error}{" "}
                    <Link href="/forgot-password" className="font-semibold underline">
                        Request a new link
                    </Link>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <input type="hidden" {...register("token")} />

                <div>
                    <label htmlFor="reset-password" className={labelClass}>
                        New Password
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Lock className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="reset-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...register("password")}
                            className={inputClass}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                    </div>
                    {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <div>
                    <label htmlFor="reset-confirm-password" className={labelClass}>
                        Confirm Password
                    </label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Lock className="h-[18px] w-[18px] text-gray-400" />
                        </div>
                        <input
                            id="reset-confirm-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...register("confirmPassword")}
                            className={inputClass}
                        />
                    </div>
                    {errors.confirmPassword && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword.message}</p>
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
                                Updating...
                            </>
                        ) : (
                            "Update password"
                        )}
                    </span>
                </button>
            </form>
        </div>
    );
}
