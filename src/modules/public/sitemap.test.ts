import { describe, expect, it } from "vitest";
import type { BlogConfig } from "@/modules/public/blog-config";
import { buildRobotsTxt, buildSitemapEntries } from "@/modules/public/sitemap";

const config: BlogConfig = {
  title: "PostForge",
  description: "Blog",
  baseUrl: "https://example.com",
  postsPerPage: 12,
  rssEnabled: true,
  analyticsEnabled: true,
  defaultSeoImage: null,
};

describe("sitemap and robots helpers", () => {
  it("includes only published post URLs plus public index pages", () => {
    const entries = buildSitemapEntries({
      config,
      posts: [{ slug: "published-only", updatedAt: new Date("2026-06-01") }],
      tags: [{ slug: "news" }],
      categories: [{ slug: "updates" }],
    });

    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://example.com/");
    expect(urls).toContain("https://example.com/blog");
    expect(urls).toContain("https://example.com/blog/published-only");
    expect(urls).toContain("https://example.com/tags/news");
    expect(urls).toContain("https://example.com/categories/updates");
    expect(urls).not.toContain("https://example.com/admin");
  });

  it("disallows admin routes in robots.txt", () => {
    const robots = buildRobotsTxt(config);
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/admin");
    expect(robots).toContain("Sitemap: https://example.com/sitemap.xml");
    expect(robots).toContain("https://example.com/llms.txt");
    expect(robots).toContain("not a Google Search requirement");
  });
});
