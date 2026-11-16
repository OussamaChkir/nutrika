import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { token } = await searchParams;
    const resetToken = typeof token === "string" ? token : "";

    if (!resetToken) {
        return (
            <div className="w-full animate-fade-in-up text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
                    <LinkIcon className="h-7 w-7 text-red-500" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Invalid reset link
                </h1>
                <p className="text-gray-400 dark:text-gray-500 mt-2 text-[15px]">
                    This link is missing its token. Request a new one to choose a new password.
                </p>
                <Link
                    href="/forgot-password"
                    className="mt-8 inline-block text-[14px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                    Request a new link
                </Link>
            </div>
        );
    }

    return <ResetPasswordForm token={resetToken} />;
}
