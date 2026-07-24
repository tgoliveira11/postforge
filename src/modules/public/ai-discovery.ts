import type { BlogConfig } from "./blog-config";
import type { PublicPostBundle } from "./public-posts.repository";
import { publicPostPath } from "@/modules/posts/slug";

export const LLMS_TXT_PATH = "/llms.txt" as const;
export const LLMS_FULL_TXT_PATH = "/llms-full.txt" as const;

export type AiDiscoverySource = {
  config: BlogConfig;
  posts: PublicPostBundle[];
  tags: Array<{ name: string; slug: string; postCount?: number }>;
  categories: Array<{
    name: string;
    slug: string;
    description?: string | null;
    postCount?: number;
  }>;
};

function baseUrl(config: BlogConfig): string {
  return config.baseUrl.replace(/\/$/, "");
}

function absoluteUrl(config: BlogConfig, path: string): string {
  return `${baseUrl(config)}${path.startsWith("/") ? "" : "/"}${path}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "unpublished";
}

function formatTags(tags: PublicPostBundle["tags"]): string {
  return tags.length > 0 ? tags.map((tag) => tag.name).join(", ") : "none";
}

function articleUrl(config: BlogConfig, bundle: PublicPostBundle): string {
  return absoluteUrl(config, publicPostPath(bundle.post.slug));
}

function renderPublicPages(config: BlogConfig): string {
  const pages = [
    ["Home", "/"],
    ["Articles", "/blog"],
    ["Categories", "/categories"],
    ["Tags", "/tags"],
    ["Search", "/search"],
    ["RSS", "/rss.xml"],
    ["Sitemap", "/sitemap.xml"],
    ["Full AI content", LLMS_FULL_TXT_PATH],
  ] as const;

  return pages.map(([label, path]) => `- [${label}](${absoluteUrl(config, path)})`).join("\n");
}

function renderTaxonomy(
  config: BlogConfig,
  path: "categories" | "tags",
  items: Array<{ name: string; slug: string; description?: string | null; postCount?: number }>
): string {
  if (items.length === 0) {
    return "- No public taxonomy entries yet.";
  }

  return items
    .map((item) => {
      const count = typeof item.postCount === "number" ? ` (${item.postCount} posts)` : "";
      const description = item.description ? ` - ${item.description}` : "";
      return `- [${item.name}](${absoluteUrl(config, `/${path}/${item.slug}`)})${count}${description}`;
    })
    .join("\n");
}

function renderArticleIndex(config: BlogConfig, posts: PublicPostBundle[]): string {
  if (posts.length === 0) {
    return "- No published articles yet.";
  }

  return posts
    .map((bundle) => {
      const excerpt = normalizeText(bundle.post.excerpt);
      const category = bundle.category?.name ?? "Uncategorized";
      const summary = excerpt ? ` - ${excerpt}` : "";
      return `- [${bundle.post.title}](${articleUrl(config, bundle)})${summary} Category: ${category}. Tags: ${formatTags(bundle.tags)}. Updated: ${formatDate(bundle.post.updatedAt)}.`;
    })
    .join("\n");
}

export function buildLlmsTxt(source: AiDiscoverySource): string {
  return `# ${source.config.title}

> ${source.config.description}

This file is a concise, AI-readable map of public content on ${baseUrl(source.config)}.
It is intended for LLM and browser-agent discovery workflows. Google Search does not require or specially use this file.

## Site

- Canonical URL: ${baseUrl(source.config)}
- Language: ${source.config.language ?? "en"}
- RSS: ${absoluteUrl(source.config, "/rss.xml")}
- Sitemap: ${absoluteUrl(source.config, "/sitemap.xml")}

## Public Pages

${renderPublicPages(source.config)}

## Categories

${renderTaxonomy(source.config, "categories", source.categories)}

## Tags

${renderTaxonomy(source.config, "tags", source.tags)}

## Published Articles

${renderArticleIndex(source.config, source.posts)}
`;
}

export function buildLlmsFullTxt(source: AiDiscoverySource): string {
  const articles = source.posts
    .map((bundle) => {
      const excerpt = normalizeText(bundle.post.excerpt);
      const content = normalizeText(bundle.post.contentMarkdown);

      return `## ${bundle.post.title}

URL: ${articleUrl(source.config, bundle)}
Published: ${formatDate(bundle.post.publishedAt)}
Updated: ${formatDate(bundle.post.updatedAt)}
Category: ${bundle.category?.name ?? "Uncategorized"}
Tags: ${formatTags(bundle.tags)}
Excerpt: ${excerpt || "No excerpt provided."}

${content || "No article body available."}`;
    })
    .join("\n\n---\n\n");

  return `# ${source.config.title} - Full Public Content

This file exports public, published content for LLM and browser-agent discovery workflows.
Google Search does not require or specially use llms.txt or llms-full.txt files.

## Site

${source.config.description}

## Public Pages

${renderPublicPages(source.config)}

## Articles

${articles || "No published articles yet."}
`;
}
