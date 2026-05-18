import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card";
import {
  Scan,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  LineChart,
  HeartPulse,
  Scale,
  ArrowRight,
  Star,
  Users,
  ShoppingBag,
  ChevronDown,
  PlayCircle
} from "lucide-react";

export default async function HomePage() {
  const t = await getTranslations('Home');

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
            {t('heroBadge')}
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6 leading-[1.1]">
            {t('heroTitle')}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orangina-300">
              {t('heroSubtitle')}
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed font-medium">
            {t('heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
            <Link href="/scan" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-lg shadow-orange-500/30 animate-pulse-glow gap-2 bg-gradient-to-r from-orange-500 to-orangina-300 hover:from-orange-600 hover:to-orange-400 text-white border-0 transition-all hover:scale-105">
                <Scan className="h-5 w-5" />
                {t('scanButton')}
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-2 border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all hover:border-orange-300 dark:hover:border-orange-800">
                {t('createAccountButton')}
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* 2. Key Features */}
      <section className="px-4 py-24 bg-neutral-50/50 dark:bg-neutral-900/20 border-t border-neutral-100 dark:border-neutral-900 relative">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              {t('featuresTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Scan,
                title: "Instant Food Scanning",
                desc: "Scan any product barcode and instantly access detailed nutrition facts.",
                color: "from-blue-400 to-blue-600",
                delay: "delay-100"
              },
              {
                icon: LineChart,
                title: "Nutrition Scores",
                desc: "Get clear food scores based on calories, sugar, fats, salt, protein, and overall balance.",
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

      {/* 3. About Section */}
      <section className="px-4 py-20 bg-orange-50/50 dark:bg-orange-950/20 border-t border-orange-100/50 dark:border-orange-900/30">
        <div className="mx-auto max-w-4xl text-center space-y-6 animate-fade-in-up delay-100">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-800 to-neutral-600 dark:from-neutral-200 dark:to-neutral-400">
            Your Smart Nutrition Companion
          </h2>
          <div className="prose prose-lg dark:prose-invert mx-auto text-neutral-600 dark:text-neutral-400">
            <p className="leading-relaxed">
              Nutrika is a powerful food barcode scanner app that helps you instantly understand the nutritional value, health benefits, and allergen alerts of any packaged food product. With Nutrika, you can make smarter, healthier eating decisions with data-driven insights, no guesswork needed.
            </p>
            <p className="leading-relaxed">
              Nutrika is ideal for fitness lovers, health-conscious consumers, diet planners, families, and anyone looking to improve their diet by understanding what's inside their food.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Why Choose Nutrika (SEO Pillars) */}
      <section className="px-4 py-24 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-16 animate-fade-in-up">
            Why Choose Nutrika ?
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4 animate-fade-in-up delay-100 p-6 rounded-3xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30">
              <div className="">
                <Image src="/nutritional-information-icon.png" alt="1" width={75} height={75} className="dark:hidden block" />
                <Image src="/nutritional-information-icon-dark.png" alt="1" width={75} height={75} className="hidden dark:block rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Accurate Nutritional Information</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Nutrika analyzes calories, fats, sugars, protein, and micronutrients to help you choose foods that support your health goals. By searching for <strong>nutrition facts</strong>, <strong>high protein foods</strong>, and <strong>healthy eating tips</strong>, Nutrika guides you exactly to what your body needs.
              </p>
            </div>

            <div className="space-y-4 animate-fade-in-up delay-200 p-6 rounded-3xl bg-orangina-50/50 dark:bg-orangina-950/10 border border-orange-100/50 dark:border-orangina-900/30">
              <div className="">
                <Image src="/allergen-detection-icon.png" alt="1" width={75} height={75} className="dark:hidden block" />
                <Image src="/allergen-detection-icon-dark.png" alt="1" width={75} height={75} className="hidden dark:block rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Smart Allergen Detection</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Millions of people worldwide look for allergen info before buying food. With Nutrika, get instant warnings about common triggers like gluten, lactose, nuts, and soy, helping users with food intolerance or allergies shop with confidence.
              </p>
            </div>

            <div className="space-y-4 animate-fade-in-up delay-300 p-6 rounded-3xl bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30">
              <div className="">
                <Image src="/healthy-eating-icon.png" alt="1" width={75} height={75} className="dark:hidden block" />
                <Image src="/healthy-eating-icon-dark.png" alt="1" width={75} height={75} className="hidden dark:block rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Healthy Eating for Everyone</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Whether you follow a keto diet, high protein meal plan, plant-based lifestyle, or general balanced diet, Nutrika helps you understand nutritional quality across <strong>high protein foods</strong>, <strong>healthy eating</strong>, and <strong>diet plan ideas</strong>.
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
              How It Works
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Nutrika uses barcode data and trusted databases to provide fast analysis in three simple steps. Ideal for daily use at the supermarket, at home, or on the go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative animate-fade-in-up delay-200">
            {/* Horizontal Line connecting steps (Desktop only) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orangina-300 dark:from-orange-900 dark:via-orange-600 dark:to-orange-500 -z-10" />

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Scan className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Scan the Barcode</h3>
              <p className="text-neutral-600 dark:text-neutral-400">Point your camera at any food product barcode.</p>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Shield className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Get Details</h3>
              <p className="text-neutral-600 dark:text-neutral-400">View calories, macros, and instant health scores.</p>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Sparkles className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Choose Better</h3>
              <p className="text-neutral-600 dark:text-neutral-400">Make smarter food choices based on data insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Testimonials (Social Proof) */}
      <section className="px-4 py-24 bg-orange-50/30 dark:bg-orange-950/10 border-t border-neutral-100 dark:border-neutral-900 relative">
        <div className="mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              Loved by Thousands
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-medium">
              See what our community is saying about Nutrika and how it has changed their daily eating habits.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah L.",
                role: "Fitness Enthusiast",
                text: "Nutrika is a game-changer! I can instantly see if a product fits my macros. It saves me so much time at the grocery store.",
                rating: 5
              },
              {
                name: "Marc D.",
                role: "Allergy Sufferer",
                text: "Having a gluten intolerance makes shopping stressful. With Nutrika's instant alerts, I finally feel safe buying new snacks.",
                rating: 5
              },
              {
                name: "Emma W.",
                role: "Health Conscious Mom",
                text: "I love the Eco-score feature. It helps me choose better products for my kids and the environment. Highly recommended!",
                rating: 5
              }
            ].map((review, i) => (
              <Card key={i} className="group border border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300">
                <CardContent className="p-8 flex flex-col gap-6 h-full">
                  <div className="flex gap-1.5 text-amber-400">
                    {[...Array(review.rating)].map((_, idx) => (
                      <Star key={idx} className="w-5 h-5 fill-current drop-shadow-sm" />
                    ))}
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 text-lg italic leading-relaxed flex-grow">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orangina-300 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">{review.name}</h4>
                      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{review.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section className="px-4 py-24 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 font-medium">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="space-y-4 animate-fade-in-up delay-100">
            {[
              {
                q: "Is Nutrika free?",
                a: "Yes! Nutrika is completely free to download and use for scanning basic nutritional data and allergen alerts. We also offer a premium tier for advanced personalized insights."
              },
              {
                q: "What databases do you use?",
                a: "Nutrika relies on comprehensive, globally recognized food databases such as Open Food Facts, combined with our proprietary data validation algorithms to ensure maximum accuracy."
              },
              {
                q: "How accurate are the scores?",
                a: "Our scores are highly accurate and based on the standard Nutri-Score calculation rules, incorporating calories, saturated fats, sugars, sodium, protein, and fiber."
              },
              {
                q: "Can I use it offline?",
                a: "You need an internet connection to scan new products. However, previously scanned items and your history are cached locally so you can view them anytime."
              }
            ].map((faq, i) => (
              <details key={i} className="group border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/50 overflow-hidden transition-all duration-300 open:bg-white dark:open:bg-neutral-900 hover:border-orange-200 dark:hover:border-orange-900/50 shadow-sm open:shadow-lg">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-lg text-neutral-900 dark:text-neutral-100 select-none">
                  <span>{faq.q}</span>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-all duration-300 group-hover:text-orange-500 group-hover:border-orange-200 dark:group-hover:border-orange-800 group-open:bg-orange-50 dark:group-open:bg-orange-900/20 group-open:text-orange-600 dark:group-open:text-orange-400 group-open:border-orange-200 dark:group-open:border-orange-800 group-open:rotate-180">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </summary>
                <div className="px-6 pb-6 pt-2 text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed animate-fade-in border-t border-neutral-100 dark:border-neutral-800/50 mx-6">
                  {faq.a}
                </div>
              </details>
            ))}
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
            Because knowing what you eat changes how you eat. Start your health journey today.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto mt-4">
            <Link href="/scan" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-lg font-bold bg-white text-orange-600 hover:bg-neutral-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all gap-3 border-0">
                <Scan className="w-6 h-6" />
                Try Free Demo
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-lg font-bold border-2 border-white/50 text-white bg-white/10 backdrop-blur hover:bg-white hover:text-orange-600 transition-all gap-3">
                <PlayCircle className="w-6 h-6" />
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
