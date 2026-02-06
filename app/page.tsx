import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scan, Shield, Sparkles, AlertTriangle, CheckCircle, Leaf } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-200/40 to-amber-200/40 blur-3xl dark:from-orange-900/20 dark:to-amber-900/20" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-6xl">
            Know What You{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Eat
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400 md:text-xl">
            Scan any product barcode to instantly discover its nutritional score,
            health benefits, potential risks, and allergen warnings.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/scan">
              <Button size="lg" className="gap-2 text-base">
                <Scan className="h-5 w-5" />
                Scan a Product
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline" className="text-base">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-neutral-200/60 bg-white/50 px-4 py-16 dark:border-neutral-800/60 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100 md:text-3xl">
            Make Informed Food Choices
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600 dark:text-neutral-400">
            Get instant access to comprehensive product analysis powered by Open Food Facts data
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Smart Scoring
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Our algorithm analyzes sugar, additives, processing level, and more to give you a clear A-E grade
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Allergen Alerts
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Instantly see allergens with severity levels, helping you stay safe and informed
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30">
                  <Leaf className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Health Insights
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  See positive aspects like fiber content and organic labels, alongside warnings for processed foods
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100 md:text-3xl">
            How It Works
          </h2>

          <div className="mt-12 flex flex-col gap-8 md:flex-row md:gap-4">
            {[
              {
                step: "1",
                title: "Scan Barcode",
                description: "Use your phone camera to scan any product barcode",
              },
              {
                step: "2",
                title: "Get Analysis",
                description: "We analyze nutritional data and calculate a health score",
              },
              {
                step: "3",
                title: "Make Choices",
                description: "Use insights to make healthier food decisions",
              },
            ].map((item, index) => (
              <div key={index} className="flex flex-1 flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-xl font-bold text-white shadow-lg shadow-orange-500/30">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/scan">
              <Button size="lg" className="gap-2">
                <Scan className="h-5 w-5" />
                Try It Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-neutral-200/60 bg-gradient-to-br from-orange-500 to-amber-600 px-4 py-16 dark:border-neutral-800/60">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Start Making Healthier Choices Today
          </h2>
          <p className="mt-4 text-orange-100">
            Create a free account to save your scans and contribute to our database
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-white text-orange-600 hover:bg-neutral-100"
              >
                Create Free Account
              </Button>
            </Link>
            <Link href="/scan">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                Scan Without Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
