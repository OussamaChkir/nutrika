import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/json-ld";
import { constructMetadata } from "@/lib/seo";
import {
  Scan,
  Shield,
  Sparkles,
  AlertTriangle,
  LineChart,
  Star,
  ChevronDown,
  PlayCircle
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return constructMetadata({
    title: "Nutrika - Know What You Eat",
    description: "Scan product barcodes to discover nutritional scores, health insights, and allergen warnings.",
    locale,
    path: "/",
  });
}

export default async function HomePage() {
  const t = await getTranslations('Home');

  const features = [
    {
      icon: Scan,
      titleKey: "featureInstantScanTitle" as const,
      descKey: "featureInstantScanDesc" as const,
      color: "from-blue-400 to-blue-600",
      delay: "delay-100"
    },
    {
      icon: LineChart,
      titleKey: "featureScoresTitle" as const,
      descKey: "featureScoresDesc" as const,
      color: "from-green-400 to-green-600",
      delay: "delay-200"
    },
    {
      icon: AlertTriangle,
      titleKey: "featureAllergensTitle" as const,
      descKey: "featureAllergensDesc" as const,
      color: "from-red-400 to-orange-500",
      delay: "delay-300"
    },
  ];

  const reviews = [
    { nameKey: "review1Name" as const, roleKey: "review1Role" as const, textKey: "review1Text" as const },
    { nameKey: "review2Name" as const, roleKey: "review2Role" as const, textKey: "review2Text" as const },
    { nameKey: "review3Name" as const, roleKey: "review3Role" as const, textKey: "review3Text" as const },
  ];

  const faqs = [
    { qKey: "faq1Q" as const, aKey: "faq1A" as const },
    { qKey: "faq2Q" as const, aKey: "faq2A" as const },
    { qKey: "faq3Q" as const, aKey: "faq3A" as const },
    { qKey: "faq4Q" as const, aKey: "faq4A" as const },
  ];

  const richTags = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
  };

  return (
    <div className="flex flex-col w-full overflow-hidden">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map(faq => ({
            "@type": "Question",
            name: t(faq.qKey),
            acceptedAnswer: {
              "@type": "Answer",
              text: t(faq.aKey)
            }
          }))
        }}
      />
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32 flex flex-col items-center justify-center min-h-[85vh]">
        <div className="absolute inset-0 -z-10 animate-gradient bg-[length:200%_200%] bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30" />

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

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6 leading-[1.1]">
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
            {features.map((feature, i) => (
              <Card key={i} className={`group border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:shadow-xl hover:shadow-neutral-200/20 dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-fade-in-up ${feature.delay}`}>
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {t(feature.descKey)}
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
            {t('aboutTitle')}
          </h2>
          <div className="prose prose-lg dark:prose-invert mx-auto text-neutral-600 dark:text-neutral-400">
            <p className="leading-relaxed">
              {t('aboutP1')}
            </p>
            <p className="leading-relaxed">
              {t('aboutP2')}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Why Choose Nutrika */}
      <section className="px-4 py-24 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-16 animate-fade-in-up">
            {t('whyTitle')}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4 animate-fade-in-up delay-100 p-6 rounded-3xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30">
              <div className="">
                <Image src="/nutritional-information-icon.png" alt="Nutritional Information Icon" width={75} height={75} className="dark:hidden block" />
                <Image src="/nutritional-information-icon-dark.png" alt="Nutritional Information Icon (Dark)" width={75} height={75} className="hidden dark:block rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('pillarAccurateTitle')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t.rich('pillarAccurateDesc', richTags)}
              </p>
            </div>

            <div className="space-y-4 animate-fade-in-up delay-200 p-6 rounded-3xl bg-orangina-50/50 dark:bg-orangina-950/10 border border-orange-100/50 dark:border-orangina-900/30">
              <div className="">
                <Image src="/allergen-detection-icon.png" alt="Allergen Detection Icon" width={75} height={75} className="dark:hidden block" />
                <Image src="/allergen-detection-icon-dark.png" alt="Allergen Detection Icon (Dark)" width={75} height={75} className="hidden dark:block rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('pillarAllergenTitle')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('pillarAllergenDesc')}
              </p>
            </div>

            <div className="space-y-4 animate-fade-in-up delay-300 p-6 rounded-3xl bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30">
              <div className="">
                <Image src="/healthy-eating-icon.png" alt="Healthy Eating Icon" width={75} height={75} className="dark:hidden block" />
                <Image src="/healthy-eating-icon-dark.png" alt="Healthy Eating Icon (Dark)" width={75} height={75} className="hidden dark:block rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('pillarHealthyTitle')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t.rich('pillarHealthyDesc', richTags)}
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
              {t('howTitle')}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              {t('howDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative animate-fade-in-up delay-200">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orangina-300 dark:from-orange-900 dark:via-orange-600 dark:to-orange-500 -z-10" />

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Scan className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{t('step1Title')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400">{t('step1Desc')}</p>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Shield className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{t('step2Title')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400">{t('step2Desc')}</p>
            </div>

            <div className="flex flex-col items-center text-center relative">
              <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-900 shadow-[0_0_40px_-10px_rgba(251,146,60,0.3)] flex items-center justify-center mb-6 border border-orange-100 dark:border-neutral-800 z-10 transition-transform hover:scale-105">
                <Sparkles className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{t('step3Title')}</h3>
              <p className="text-neutral-600 dark:text-neutral-400">{t('step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="px-4 py-24 bg-orange-50/30 dark:bg-orange-950/10 border-t border-neutral-100 dark:border-neutral-900 relative">
        <div className="mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              {t('testimonialsTitle')}
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-medium">
              {t('testimonialsDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review, i) => {
              const name = t(review.nameKey);
              return (
                <Card key={i} className="group border border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 transition-all duration-300">
                  <CardContent className="p-8 flex flex-col gap-6 h-full">
                    <div className="flex gap-1.5 text-amber-400">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="w-5 h-5 fill-current drop-shadow-sm" />
                      ))}
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 text-lg italic leading-relaxed flex-grow">
                      &ldquo;{t(review.textKey)}&rdquo;
                    </p>
                    <div className="flex items-center gap-4 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orangina-300 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">{name}</h4>
                        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t(review.roleKey)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section className="px-4 py-24 bg-white dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-900">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight">
              {t('faqTitle')}
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 font-medium">
              {t('faqSubtitle')}
            </p>
          </div>

          <div className="space-y-4 animate-fade-in-up delay-100">
            {faqs.map((faq, i) => (
              <details key={i} className="group border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/50 overflow-hidden transition-all duration-300 open:bg-white dark:open:bg-neutral-900 hover:border-orange-200 dark:hover:border-orange-900/50 shadow-sm open:shadow-lg">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-lg text-neutral-900 dark:text-neutral-100 select-none">
                  <span>{t(faq.qKey)}</span>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-all duration-300 group-hover:text-orange-500 group-hover:border-orange-200 dark:group-hover:border-orange-800 group-open:bg-orange-50 dark:group-open:bg-orange-900/20 group-open:text-orange-600 dark:group-open:text-orange-400 group-open:border-orange-200 dark:group-open:border-orange-800 group-open:rotate-180">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </summary>
                <div className="px-6 pb-6 pt-2 text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed animate-fade-in border-t border-neutral-100 dark:border-neutral-800/50 mx-6">
                  {t(faq.aKey)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="relative px-4 py-24 overflow-hidden border-t-4 border-white/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-orangina-400 z-0"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSIjRkZGIiAvPgo8L3N2Zz4=')]"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-md mb-8 ring-8 ring-white/10 shadow-2xl">
            <Scan className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-sm tracking-tight">
            {t('ctaTitle')}
          </h2>
          <p className="text-xl md:text-2xl text-orange-50 mb-12 max-w-2xl mx-auto font-medium">
            {t('ctaDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto mt-4">
            <Link href="/scan" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-lg font-bold bg-white text-orange-600 hover:bg-neutral-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all gap-3 border-0">
                <Scan className="w-6 h-6" />
                {t('ctaScanButton')}
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-lg font-bold border-2 border-white/50 text-white bg-white/10 backdrop-blur hover:bg-white hover:text-orange-600 transition-all gap-3">
                <PlayCircle className="w-6 h-6" />
                {t('ctaSignUpButton')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
