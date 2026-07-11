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

const fallbackBlogs: BlogPost[] = [
  {
    slug: "benefits-of-scanning-food-labels",
    title: "The Hidden Benefits of Scanning Food Labels",
    description: "Discover why scanning food barcodes can dramatically improve your diet and overall health. Learn to uncover hidden sugars and manage allergies easily.",
    content: "<p>In today's fast-paced world, it's easy to grab packaged foods without reading the ingredients. However, scanning barcodes with Nutrika can reveal a wealth of hidden information.</p><h2>Uncover Hidden Sugars</h2><p>Many foods marketed as 'healthy' contain excessive amounts of added sugars. By scanning the barcode, you can instantly see the nutritional breakdown.</p>",
    date: "2024-01-15T00:00:00",
    author: "Nutrika Health Team"
  },
  {
    slug: "understanding-nutriscore",
    title: "Understanding Nutri-Score: A Complete Guide",
    description: "Learn how the Nutri-Score is calculated and how it helps you make healthier grocery choices balancing positive and negative points.",
    content: "<p>The Nutri-Score system is designed to make healthy eating simpler. But how does it actually work?</p><h2>The Grading System</h2><p>It ranks foods from A (dark green) to E (dark red). 'A' represents the most nutritionally favorable choices, while 'E' represents the least.</p>",
    date: "2024-02-02T00:00:00",
    author: "Nutrika Nutritionists"
  }
];

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${WP_API_URL}/posts?_embed`, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.error(`WP API error: ${res.status} ${res.statusText}`);
      return fallbackBlogs;
    }
    
    const text = await res.text();
    let posts;
    try {
      posts = JSON.parse(text);
    } catch (e) {
      console.error("WP API blocked the request (likely InfinityFree anti-bot). Returning fallback blogs.");
      return fallbackBlogs;
    }

    return posts.map((post: any) => ({
      slug: post.slug,
      title: post.title.rendered,
      description: post.excerpt.rendered.replace(/<[^>]+>/g, '').trim(),
      content: post.content.rendered,
      date: post.date,
      author: post._embedded?.author?.[0]?.name || "Nutrika Team",
      imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
    }));
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return fallbackBlogs;
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  // Check if it's a fallback blog first
  const fallbackMatch = fallbackBlogs.find(b => b.slug === slug);
  
  try {
    const res = await fetch(`${WP_API_URL}/posts?_embed&slug=${slug}`, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!res.ok) {
      console.error(`WP API error fetching post ${slug}: ${res.status} ${res.statusText}`);
      return fallbackMatch;
    }
    
    const text = await res.text();
    let posts;
    try {
      posts = JSON.parse(text);
    } catch (e) {
      console.error(`WP API blocked the request for ${slug}. Returning fallback.`);
      return fallbackMatch;
    }

    if (!posts || posts.length === 0) return fallbackMatch;
    
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
    return fallbackMatch;
  }
}
