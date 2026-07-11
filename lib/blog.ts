export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  author: string;
  imageUrl?: string;
}

const WP_API_URL = "https://blognutrikafood.kesug.com/wp-json/wp/v2";

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${WP_API_URL}/posts?_embed`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const posts = await res.json();
    return posts.map((post: any) => ({
      slug: post.slug,
      title: post.title.rendered,
      // Strip HTML tags for description and remove HTML entities if needed, but a simple replace is ok
      description: post.excerpt.rendered.replace(/<[^>]+>/g, '').trim(),
      content: post.content.rendered,
      date: post.date,
      author: post._embedded?.author?.[0]?.name || "Nutrika Team",
      imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
    }));
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  try {
    const res = await fetch(`${WP_API_URL}/posts?_embed&slug=${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return undefined;
    const posts = await res.json();
    if (!posts || posts.length === 0) return undefined;
    const post = posts[0];
    return {
      slug: post.slug,
      title: post.title.rendered,
      description: post.excerpt.rendered.replace(/<[^>]+>/g, '').trim(),
      content: post.content.rendered,
      date: post.date,
      author: post._embedded?.author?.[0]?.name || "Nutrika Team",
      imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
    };
  } catch (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return undefined;
  }
}
