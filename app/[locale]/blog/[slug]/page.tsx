import { getBlogPost, fetchBlogPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { JsonLd } from "@/components/json-ld";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function generateStaticParams() {
  const posts = await fetchBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: "Not Found",
    };
  }

  const title = post.title;
  const description = post.description;

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
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Blog" });
  const title = post.title;
  const description = post.description;
  const content = post.content;

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
          <h1 className="text-4xl font-extrabold tracking-tight mb-4" dangerouslySetInnerHTML={{ __html: title }}></h1>
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

        {post.imageUrl && (
          <div className="mb-8 not-prose rounded-xl overflow-hidden relative w-full h-[400px]">
            <Image 
              src={post.imageUrl} 
              alt={title} 
              fill 
              className="object-cover" 
            />
          </div>
        )}

        <div
          dangerouslySetInnerHTML={{
            __html: content
          }}
        />
      </article>
    </div>
  );
}
