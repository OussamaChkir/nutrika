import { getBlogPost, blogPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { JsonLd } from "@/components/json-ld";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Not Found",
    };
  }

  const title = post.title[locale] || post.title["en"];
  const description = post.description[locale] || post.description["en"];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Blog" });
  const title = post.title[locale] || post.title["en"];
  const description = post.description[locale] || post.description["en"];
  const content = post.content[locale] || post.content["en"];

  // Article JSON-LD for rich snippets
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "Nutrika",
      logo: {
        "@type": "ImageObject",
        url: "https://nutrikafood.com/icons/icon1.png",
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <JsonLd data={articleJsonLd} />
      
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToBlog")}
        </Link>
      </div>

      <article className="prose prose-neutral dark:prose-invert lg:prose-lg mx-auto">
        <div className="mb-8 not-prose">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            {title}
          </h1>
          <div className="flex items-center gap-x-4 text-sm text-muted-foreground">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>•</span>
            <span>{post.author}</span>
          </div>
        </div>

        {/* Basic markdown rendering via dangerouslySetInnerHTML or you could use a proper MD parser */}
        <div
          dangerouslySetInnerHTML={{
            __html: content
              .split('\n')
              .filter(line => line.trim() !== '')
              .map(line => {
                if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
                if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
                return `<p>${line}</p>`;
              })
              .join('')
          }}
        />
      </article>
    </div>
  );
}
