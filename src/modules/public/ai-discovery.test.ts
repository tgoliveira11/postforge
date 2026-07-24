import { describe, expect, it } from "vitest";
import type { BlogConfig } from "@/modules/public/blog-config";
import type { PublicPostBundle } from "@/modules/public/public-posts.repository";
import { buildLlmsFullTxt, buildLlmsTxt } from "@/modules/public/ai-discovery";

const config: BlogConfig = {
  title: "PostForge",
  description: "A publishing template",
  baseUrl: "https://example.com/",
  postsPerPage: 12,
  rssEnabled: true,
  analyticsEnabled: true,
  defaultSeoImage: null,
  language: "en",
};

function makeBundle(): PublicPostBundle {
  const now = new Date("2026-06-14T12:00:00.000Z");
  return {
    post: {
      id: "post-1",
      title: "Hello World",
      slug: "hello-world",
      excerpt: "Short excerpt",
      contentMarkdown: "# Hello\n\nBody copy",
      contentHtmlCache: null,
      coverAssetId: null,
      status: "published",
      featured: false,
      pinned: false,
      pinnedPriority: 0,
      publicOrder: null,
      categoryId: "cat-1",
      publishedAt: now,
      scheduledAt: null,
      unpublishedAt: null,
      seoTitle: null,
      seoDescription: null,
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogAssetId: null,
      readingTimeMinutes: 3,
      createdBy: "user-1",
      updatedBy: "user-1",
      createdAt: now,
      updatedAt: now,
    },
    category: {
      id: "cat-1",
      name: "Guides",
      slug: "guides",
      description: "Useful guides",
      createdAt: now,
      updatedAt: now,
    },
    tags: [{ id: "tag-1", name: "News", slug: "news", createdAt: now, updatedAt: now }],
    coverAsset: null,
  };
}

describe("AI discovery maps", () => {
  it("builds concise public maps from config, taxonomy, and posts", () => {
    const text = buildLlmsTxt({
      config,
      posts: [makeBundle()],
      tags: [{ name: "News", slug: "news", postCount: 1 }],
      categories: [{ name: "Guides", slug: "guides", description: "Useful guides", postCount: 1 }],
    });

    expect(text).toContain("# PostForge");
    expect(text).toContain("https://example.com/blog/hello-world");
    expect(text).toContain("[Guides](https://example.com/categories/guides) (1 posts)");
    expect(text).toContain("[News](https://example.com/tags/news) (1 posts)");
    expect(text).toContain("Google Search does not require or specially use this file.");
  });

  it("builds full maps with article markdown content", () => {
    const text = buildLlmsFullTxt({
      config,
      posts: [makeBundle()],
      tags: [],
      categories: [],
    });

    expect(text).toContain("# PostForge - Full Public Content");
    expect(text).toContain("Published: 2026-06-14");
    expect(text).toContain("# Hello");
    expect(text).toContain("Google Search does not require or specially use llms.txt");
  });

  it("handles empty content and missing optional post fields", () => {
    const uncategorizedBundle = {
      ...makeBundle(),
      post: {
        ...makeBundle().post,
        excerpt: null,
        contentMarkdown: "",
        publishedAt: null,
      },
      category: null,
      tags: [],
    };
    const text = buildLlmsFullTxt({
      config: { ...config, language: undefined },
      posts: [uncategorizedBundle],
      tags: [],
      categories: [],
    });
    const concise = buildLlmsTxt({
      config: { ...config, language: undefined },
      posts: [uncategorizedBundle],
      tags: [{ name: "Drafts", slug: "drafts" }],
      categories: [{ name: "Loose", slug: "loose" }],
    });
    const emptyFull = buildLlmsFullTxt({
      config,
      posts: [],
      tags: [],
      categories: [],
    });
    const emptyConcise = buildLlmsTxt({
      config,
      posts: [],
      tags: [],
      categories: [],
    });

    expect(text).toContain("Published: unpublished");
    expect(text).toContain("Category: Uncategorized");
    expect(text).toContain("Tags: none");
    expect(text).toContain("No excerpt provided.");
    expect(text).toContain("No article body available.");
    expect(concise).toContain("- Language: en");
    expect(concise).toContain("[Drafts](https://example.com/tags/drafts)");
    expect(concise).toContain("[Loose](https://example.com/categories/loose)");
    expect(concise).toContain("Category: Uncategorized. Tags: none.");
    expect(emptyFull).toContain("No published articles yet.");
    expect(emptyConcise).toContain("- No public taxonomy entries yet.");
    expect(emptyConcise).toContain("- No published articles yet.");
  });
});
