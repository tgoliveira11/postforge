import { describe, expect, it } from "vitest";
import type { BlogConfig } from "@/modules/public/blog-config";
import type { PublicPostBundle } from "@/modules/public/public-posts.repository";
import { buildRssXml } from "@/modules/public/rss";

const config: BlogConfig = {
  title: "PostForge",
  description: "Blog",
  baseUrl: "https://example.com",
  postsPerPage: 12,
  rssEnabled: true,
  analyticsEnabled: true,
  defaultSeoImage: null,
};

function makeBundle(slug: string, title: string): PublicPostBundle {
  const now = new Date("2026-06-14T12:00:00.000Z");
  return {
    post: {
      id: slug,
      title,
      slug,
      excerpt: "Excerpt",
      contentMarkdown: "Body",
      contentHtmlCache: null,
      coverAssetId: null,
      status: "published",
      featured: false,
      pinned: false,
      pinnedPriority: 0,
      publicOrder: null,
      categoryId: null,
      publishedAt: now,
      scheduledAt: null,
      unpublishedAt: null,
      seoTitle: null,
      seoDescription: null,
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogAssetId: null,
      readingTimeMinutes: 1,
      createdBy: "user",
      updatedBy: "user",
      createdAt: now,
      updatedAt: now,
    },
    category: null,
    tags: [],
    coverAsset: null,
  };
}

describe("rss builder", () => {
  it("includes only provided published bundles", () => {
    const xml = buildRssXml(config, [makeBundle("published-post", "Published")]);
    expect(xml).toContain("<title>Published</title>");
    expect(xml).toContain("https://example.com/blog/published-post");
    expect(xml).not.toContain("draft-post");
  });

  it("escapes XML entities", () => {
    const xml = buildRssXml(config, [makeBundle("unsafe", "Title & <More>")]);
    expect(xml).toContain("Title &amp; &lt;More&gt;");
  });

  it("preserves blog listing order and keeps actual published dates in pubDate", () => {
    const bundles = [
      makeBundle("post-a", "Post A"),
      makeBundle("post-b", "Post B"),
      makeBundle("post-c", "Post C"),
    ];
    bundles[0].post.publicOrder = 0;
    bundles[0].post.publishedAt = new Date("2026-06-16T12:00:00.000Z");
    bundles[1].post.publicOrder = 0;
    bundles[1].post.publishedAt = new Date("2026-06-15T12:00:00.000Z");
    bundles[2].post.publicOrder = 1;
    bundles[2].post.publishedAt = new Date("2026-06-20T12:00:00.000Z");

    const xml = buildRssXml(config, bundles);
    const postAIndex = xml.indexOf("<title>Post A</title>");
    const postBIndex = xml.indexOf("<title>Post B</title>");
    const postCIndex = xml.indexOf("<title>Post C</title>");

    expect(postAIndex).toBeGreaterThan(-1);
    expect(postBIndex).toBeGreaterThan(postAIndex);
    expect(postCIndex).toBeGreaterThan(postBIndex);
    expect(xml).toContain("<pubDate>Tue, 16 Jun 2026 12:00:00 GMT</pubDate>");
    expect(xml).toContain("<pubDate>Mon, 15 Jun 2026 12:00:00 GMT</pubDate>");
    expect(xml).toContain("<pubDate>Sat, 20 Jun 2026 12:00:00 GMT</pubDate>");
  });

  it("leaves pubDate empty when publishedAt is missing", () => {
    const bundle = makeBundle("draft-like", "Draft Like");
    bundle.post.publishedAt = null;

    const xml = buildRssXml(config, [bundle]);

    expect(xml).toContain("<pubDate></pubDate>");
  });

  it("includes category and tag names as RSS categories", () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    const bundle = makeBundle("categorized", "Categorized Post");
    bundle.category = {
      id: "cat-1",
      name: "Engineering",
      slug: "engineering",
      description: null,
      createdAt: now,
      updatedAt: now,
    };
    bundle.tags = [
      { id: "tag-1", name: "Release", slug: "release", createdAt: now, updatedAt: now },
      { id: "tag-2", name: "News & Updates", slug: "news-updates", createdAt: now, updatedAt: now },
    ];

    const xml = buildRssXml(config, [bundle]);

    expect(xml).toContain("<category>Engineering</category>");
    expect(xml).toContain("<category>Release</category>");
    expect(xml).toContain("<category>News &amp; Updates</category>");
  });
});
