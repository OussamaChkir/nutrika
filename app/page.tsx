import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Scan,
  Shield,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Globe2,
  CheckCircle2,
  LineChart,
  HeartPulse,
  Scale,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32 flex flex-col items-center justify-center min-h-[85vh]">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 -z-10 animate-gradient bg-[length:200%_200%] bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30" />

        {/* Floating Decorative Orbs */}
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-orange-400/20 dark:bg-orange-500/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 right-[10%] w-80 h-80 bg-orangina-300/20 dark:bg-orangina-400/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full bg-white/40 dark:bg-neutral-950/40 blur-3xl rounded-[100%]" />

        <div className="relative z-10 mx-auto max-w-5xl text-center flex flex-col items-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-orange-200 dark:border-orange-900/50 shadow-sm backdrop-blur-md mb-8 text-sm font-medium text-orange-600 dark:text-orange-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Global Food Scanner for Smarter Eating
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6 leading-[1.1]">
            Nutrika –{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orangina-300">
              Know What You Eat
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed font-medium">
            Scan barcodes to instantly discover nutritional scores, health benefits, and allergen warnings. Make informed food choices with your reliable pocket guide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
            <Link href="/scan" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-lg shadow-orange-500/30 animate-pulse-glow gap-2 bg-gradient-to-r from-orange-500 to-orangina-300 hover:from-orange-600 hover:to-orange-400 text-white border-0 transition-all hover:scale-105">
                <Scan className="h-5 w-5" />
                Scan a Product Now
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-2 border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all hover:border-orange-300 dark:hover:border-orange-800">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. About Section */}
      <section className="px-4 py-20 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-4xl text-center space-y-6 animate-fade-in-up delay-100">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-800 to-neutral-600 dark:from-neutral-200 dark:to-neutral-400">
            About Nutrika — Your Nutrition Guide
          </h2>
          <div className="prose prose-lg dark:prose-invert mx-auto text-neutral-600 dark:text-neutral-400">
            <p className="leading-relaxed">
              Nutrika is a powerful food barcode scanner app that helps you instantly understand the nutritional value, health benefits, and allergen alerts of any packaged food product. With Nutrika, you can make smarter, healthier eating decisions with data-driven insights — no guesswork needed.
            </p>
            <p className="leading-relaxed">
              Nutrika is ideal for fitness lovers, health-conscious consumers, diet planners, families, and anyone looking to improve their diet by understanding what's inside their food.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Key Features */}
      <section className="px-4 py-24 bg-neutral-50/50 dark:bg-neutral-900/20 border-t border-neutral-100 dark:border-neutral-900 relative">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Key Features
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Everything you need for healthy eating, diet planning, weight loss, and fitness nutrition right in your pocket.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Scan,
                title: "Instant Food Scanning",
                desc: "Scan barcodes with your phone to reveal nutrition details right away.",
                color: "from-blue-400 to-blue-600",
                delay: "delay-100"
              },
              {
                icon: LineChart,
                title: "Nutrition Scores",
                desc: "Get easy-to-understand food ratings based on calories, sugar, fat, salt, and more.",
                color: "from-green-400 to-green-600",
                delay: "delay-200"
              },
              {
                icon: AlertTriangle,
                title: "Allergen Alerts",
                desc: "Know if a product contains allergens like nuts, gluten, or lactose instantly.",
                color: "from-red-400 to-orange-500",
                delay: "delay-300"
              },
              {
                icon: Lightbulb,
                title: "Healthy Insights",
                desc: "Learn positive and negative aspects of food to make better choices.",
                color: "from-amber-400 to-orange-500",
                delay: "delay-400"
              },
              {
                icon: Globe2,
                title: "Global Food Database",
                desc: "Powered by reliable data sources to support worldwide users.",
                color: "from-indigo-400 to-purple-600",
                delay: "delay-500"
              }
            ].map((feature, i) => (
              <Card key={i} className={`group border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:shadow-xl hover:shadow-neutral-200/20 dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-fade-in-up ${feature.delay}`}>
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Choose Nutrika (SEO Pillars) */}
      <section className="px-4 py-24 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-16 animate-fade-in-up">
            📌 Why Choose Nutrika?
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4 animate-fade-in-up delay-100 p-6 rounded-3xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30">
              <div className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center text-orange-500 shadow-sm mb-6 border border-orange-100 dark:border-neutral-800">
                <span className="font-bold text-xl">1</span>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Accurate Nutritional Information</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Nutrika analyzes calories, fats, sugars, protein, and micronutrients to help you choose foods that support your health goals. By searching for "nutrition facts", "high protein foods", and "healthy eating tips", Nutrika guides you exactly to what your body needs.
              </p>
            </div>

            <div className="space-y-4 animate-fade-in-up delay-200 p-6 rounded-3xl bg-orangina-50/50 dark:bg-orangina-950/10 border border-orange-100/50 dark:border-orangina-900/30">
              <div className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center text-orangina-400 shadow-sm mb-6 border border-orange-100 dark:border-neutral-800">
                <span className="font-bold text-xl">2</span>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Smart Allergen Detection</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Millions of people worldwide look for allergen info before buying food. With Nutrika, get instant warnings about common triggers like gluten, lactose, nuts, and soy, helping users with food intolerance or allergies shop with confidence.
              </p>
            </div>

            <div className="space-y-4 animate-fade-in-up delay-300 p-6 rounded-3xl bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30">
              <div className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center text-green-500 shadow-sm mb-6 border border-green-100 dark:border-neutral-800">
                <span className="font-bold text-xl">3</span>
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Healthy Eating for Everyone</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Whether you follow a keto diet, high protein meal plan, plant-based lifestyle, or general balanced diet, Nutrika helps you understand nutritional quality across "high protein foods", "healthy eating", and "diet plan ideas."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section className="px-4 py-24 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="flex items-center justify-center gap-2 text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              📍 How It Works
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Nutrika uses barcode data and trusted databases to provide fast analysis in three simple steps. Ideal for daily use — at the supermarket, at home, or on the go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative animate-fade-in-up delay-200">
            {/* Horizontal Line connecting steps (Desktop only) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orangina-300 dark:from-orange-900 dark:via-orange-600 dark:to-orange-500 -z-10" />

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Scan className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">1. Scan the Barcode</h3>
              <p className="text-neutral-600 dark:text-neutral-400">Point your camera at any food product barcode.</p>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Shield className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">2. Get Details</h3>
              <p className="text-neutral-600 dark:text-neutral-400">View calories, macros, and instant health scores.</p>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Sparkles className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">3. Choose Better</h3>
              <p className="text-neutral-600 dark:text-neutral-400">Make smarter food choices based on data insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Health & Wellness Benefits */}
      <section className="px-4 py-24 bg-orange-50/50 dark:bg-orange-950/20 border-t border-orange-100/50 dark:border-orange-900/30">
        <div className="mx-auto max-w-6xl flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-3">
                <HeartPulse className="w-8 h-8 text-orange-500" />
                📈 Health & Wellness Benefits
              </h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Nutrika empowers you to track your food quality — not just calories. Align your diet with common goals like finding "healthy fats", "whole foods", "protein sources", and "low calorie meals".
              </p>
            </div>

            <ul className="space-y-4">
              {[
                "Maximize nutrient intake efficiently",
                "Reduce hidden sugar and unhealthy fats",
                "Manage weight with smart daily choices",
                "Compare similar products easily side-by-side",
                "Track the true quality of your food"
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 transition-transform hover:translate-x-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 relative animate-fade-in-up delay-200 w-full rounded-3xl overflow-hidden aspect-square max-w-md mx-auto bg-gradient-to-tr from-orange-400 to-orangina-300 p-1">
            <div className="w-full h-full bg-white dark:bg-neutral-950 rounded-[22px] flex flex-col items-center justify-center p-8 text-center pattern-bg">
              <Scale className="w-24 h-24 text-orange-400 mb-6 opacity-80" />
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Balance Your Diet
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Data doesn't lie. Understand macros and micronutrients at a glance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing Preview */}
      <section className="px-4 py-24 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-4xl text-center animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
            🛠 Pricing & Plans
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-12">
            Nutrika offers free access for everyone, plus premium features for users looking for a complete diet tracking or nutrition coach experience.
          </p>

          <div className="grid sm:grid-cols-2 gap-8 text-left max-w-3xl mx-auto">
            {/* Free */}
            <Card className="border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 transition-transform hover:-translate-y-1">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Nutrika Free</h3>
                <div className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6">$0 <span className="text-base font-normal text-neutral-500">/ forever</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Unlimited Barcode Scans
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Basic Nutrition Scores
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Core Allergen Alerts
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20 relative shadow-xl shadow-orange-500/10 transition-transform hover:-translate-y-1">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 to-orangina-300 rounded-t-xl" />
              <div className="absolute top-4 right-4 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Nutrika Premium</h3>
                <div className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6">$5.99 <span className="text-base font-normal text-neutral-500">/ month</span></div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Everything in Free
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Save scans history
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Personalized insights
                  </li>
                  <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Advanced nutrition reports
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <div className="mt-10">
            <Link href="/pricing" className="inline-flex items-center text-orange-600 dark:text-orange-400 font-semibold hover:underline group">
              View full pricing details
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Final CTA Action */}
      <section className="relative px-4 py-24 overflow-hidden border-t-4 border-white/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-orangina-400 z-0"></div>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSIjRkZGIiAvPgo8L3N2Zz4=')]"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-md mb-8 ring-8 ring-white/10 shadow-2xl">
            <Scan className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-sm tracking-tight">
            Ready to change how you eat?
          </h2>
          <p className="text-xl md:text-2xl text-orange-50 mb-12 max-w-2xl mx-auto font-medium">
            Nutrika — because knowing what you eat changes how you eat. Start your health journey today.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto mt-4">
            <Link href="/scan" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold bg-white text-orange-600 hover:bg-neutral-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all gap-3 border-0">
                <Scan className="w-6 h-6" />
                👉 Scan a Product Now
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-lg font-bold border-2 border-white/50 text-white bg-white/10 backdrop-blur hover:bg-white hover:text-orange-600 transition-all gap-3">
                👉 Create Your Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
