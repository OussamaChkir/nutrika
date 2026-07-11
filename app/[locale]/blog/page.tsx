import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { fetchBlogPosts } from "@/lib/blog";
import Image from "next/image";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  const blogPosts = await fetchBlogPosts();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4 tracking-tight">{t("title")}</h1>
      <p className="text-lg text-muted-foreground mb-12">
        {t("description")}
      </p>

      <div className="grid gap-8">
        {blogPosts.map((post) => {
          const title = post.title;
          const description = post.description;
          return (
            <article
              key={post.slug}
              className="group relative flex flex-col items-start justify-between rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md dark:border-neutral-800"
            >
              {post.imageUrl && (
                <div className="w-full h-48 relative mb-4 rounded-xl overflow-hidden">
                  <Image 
                    src={post.imageUrl} 
                    alt={title} 
                    fill 
                    className="object-cover transition-transform group-hover:scale-105" 
                  />
                </div>
              )}
              <div className="flex items-center gap-x-4 text-xs mb-4">
                <time dateTime={post.date} className="text-muted-foreground">
                  {new Date(post.date).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="relative z-10 rounded-full bg-orange-50 dark:bg-orange-950/50 px-3 py-1.5 font-medium text-orange-600 dark:text-orange-400">
                  Nutrition
                </span>
              </div>
              <div className="group relative">
                <h3 className="mt-3 text-2xl font-semibold leading-6 text-foreground group-hover:text-orange-600 transition-colors">
                  <Link href={`/blog/${post.slug}`}>
                    <span className="absolute inset-0" />
                    <span dangerouslySetInnerHTML={{ __html: title }} />
                  </Link>
                </h3>
                <p 
                  className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>
              <div className="relative mt-8 flex items-center gap-x-4">
                <div className="text-sm leading-6">
                  <p className="font-semibold text-foreground">
                    <span className="absolute inset-0" />
                    {post.author}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
