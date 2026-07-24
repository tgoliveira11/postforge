import type { MetadataRoute } from "next";
import type { BlogConfig } from "./blog-config";
import { publicPostPath } from "@/modules/posts/slug";

export type SitemapSource = {
  config: BlogConfig;
  posts: Array<{ slug: string; updatedAt: Date }>;
  tags: Array<{ slug: string }>;
  categories: Array<{ slug: string }>;
};

export function buildSitemapEntries(source: SitemapSource): MetadataRoute.Sitemap {
  const baseUrl = source.config.baseUrl.replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/tags`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const postEntries = source.posts.map((post) => ({
    url: `${baseUrl}${publicPostPath(post.slug)}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const tagEntries = source.tags.map((tag) => ({
    url: `${baseUrl}/tags/${tag.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const categoryEntries = source.categories.map((category) => ({
    url: `${baseUrl}/categories/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries, ...tagEntries, ...categoryEntries];
}

export function buildRobotsTxt(config: BlogConfig): string {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: ${baseUrl}/sitemap.xml
# AI-readable maps for LLM/browser-agent consumers, not a Google Search requirement.
# ${baseUrl}/llms.txt
# ${baseUrl}/llms-full.txt
`;
}
