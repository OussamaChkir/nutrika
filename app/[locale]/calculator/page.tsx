import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { CalculatorClient } from "./calculator-client";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations("Calculator");
    return constructMetadata({
        title: t("title"),
        description: t("description"),
        locale,
        path: "/calculator"
    });
}

export default function CalculatorPage() {
    return (
        <div className="flex flex-col w-full min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
            <CalculatorClient />
        </div>
    );
}
