import { describe, expect, it, vi } from "vitest";

const { findAssetByIdMock } = vi.hoisted(() => ({
  findAssetByIdMock: vi.fn(async () => null),
}));

vi.mock("@/modules/public/public-posts.repository", () => ({
  findAssetById: findAssetByIdMock,
}));

import type { BlogConfig } from "@/modules/public/blog-config";
import type { PublicPostBundle } from "@/modules/public/public-posts.repository";
import {
  buildArticleBreadcrumbJsonLd,
  buildBlogPostingJsonLd,
  buildPostMetadata,
  buildPublicPageMetadata,
  buildSiteMetadata,
  buildWebsiteJsonLd,
  resolvePostSeo,
  resolvePostSeoWithImages,
  stringifyJsonLd,
} from "@/modules/public/seo";

const config: BlogConfig = {
  title: "PostForge",
  description: "A test blog",
  baseUrl: "https://example.com",
  postsPerPage: 12,
  rssEnabled: true,
  analyticsEnabled: true,
  defaultSeoImage: "/default.png",
  language: "en",
  locale: "en_US",
  authorName: "Post Author",
  publisherName: "Post Publisher",
};

function makeBundle(overrides: Partial<PublicPostBundle["post"]> = {}): PublicPostBundle {
  const now = new Date("2026-06-14T12:00:00.000Z");
  return {
    post: {
      id: "post-1",
      title: "Hello World",
      slug: "hello-world",
      excerpt: "Short excerpt",
      contentMarkdown: "Body",
      contentHtmlCache: "<p>Body</p>",
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
      readingTimeMinutes: 3,
      createdBy: "user-1",
      updatedBy: "user-1",
      createdAt: now,
      updatedAt: now,
      ...overrides,
    },
    category: null,
    tags: [{ id: "tag-1", name: "News", slug: "news", createdAt: now, updatedAt: now }],
    coverAsset: null,
  };
}

describe("seo helpers", () => {
  it("falls back to post title and excerpt", () => {
    const resolved = resolvePostSeo({ bundle: makeBundle(), config });
    expect(resolved.title).toBe("Hello World");
    expect(resolved.description).toBe("Short excerpt");
    expect(resolved.canonicalUrl).toBe("https://example.com/blog/hello-world");
    expect(resolved.siteBaseUrl).toBe("https://example.com");
    expect(resolved.authorName).toBe("Post Author");
    expect(resolved.publisherName).toBe("Post Publisher");
  });

  it("uses explicit SEO fields when present", () => {
    const resolved = resolvePostSeo({
      bundle: makeBundle({
        seoTitle: "Custom SEO",
        seoDescription: "Custom description",
        canonicalUrl: "https://example.com/custom",
        ogTitle: "OG title",
        ogDescription: "OG description",
      }),
      config,
    });

    expect(resolved.title).toBe("Custom SEO");
    expect(resolved.description).toBe("Custom description");
    expect(resolved.canonicalUrl).toBe("https://example.com/custom");
    expect(resolved.ogTitle).toBe("OG title");
  });

  it("builds metadata and JSON-LD", () => {
    const bundle = makeBundle();
    const resolved = resolvePostSeo({ bundle, config });
    const metadata = buildPostMetadata(resolved, bundle);
    const jsonLd = buildBlogPostingJsonLd(bundle, resolved);

    expect(metadata.title).toBe("Hello World");
    expect(metadata.authors).toEqual([{ name: "Post Author", url: "https://example.com/" }]);
    expect(metadata.creator).toBe("Post Author");
    expect(metadata.publisher).toBe("Post Publisher");
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { "max-image-preview": "large" },
    });
    expect(metadata.alternates?.types).toMatchObject({
      "application/rss+xml": "https://example.com/rss.xml",
    });
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd["@id"]).toBe("https://example.com/blog/hello-world#article");
    expect(jsonLd.headline).toBe("Hello World");
    expect(jsonLd.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": "https://example.com/blog/hello-world",
    });
    expect(jsonLd.timeRequired).toBe("PT3M");
  });

  it("falls back to defaultSeoImage when asset records are unavailable", async () => {
    const bundle = makeBundle({
      ogAssetId: "missing-og-asset",
      coverAssetId: "missing-cover-asset",
    });

    const resolved = await resolvePostSeoWithImages({ bundle, config });
    expect(resolved.ogImageUrl).toBe("https://example.com/default.png");
  });

  it("falls back to blog description when excerpt is missing", () => {
    const resolved = resolvePostSeo({
      bundle: makeBundle({ excerpt: null }),
      config,
    });

    expect(resolved.description).toBe("A test blog");
  });

  it("builds site metadata from blog config", () => {
    const metadata = buildSiteMetadata(config);

    expect(metadata.title).toEqual({ default: "PostForge", template: "%s | PostForge" });
    expect(metadata.description).toBe("A test blog");
    expect(metadata.metadataBase?.toString()).toBe("https://example.com/");
    expect(metadata.openGraph?.images).toEqual([
      { url: "/default.png", alt: "PostForge social preview" },
    ]);
    expect(metadata.alternates?.types).toMatchObject({
      "application/rss+xml": "https://example.com/rss.xml",
    });
  });

  it("builds public page metadata with canonical and AI-readable alternates", () => {
    const metadata = buildPublicPageMetadata(config, {
      title: "Search",
      description: "Find posts",
      canonicalPath: "/search",
    });

    expect(metadata.alternates?.canonical).toBe("/search");
    expect(metadata.openGraph?.url).toBe("https://example.com/search");
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.alternates?.types?.["text/plain"]).toEqual([
      { title: "llms.txt", url: "https://example.com/llms.txt" },
      { title: "llms-full.txt", url: "https://example.com/llms-full.txt" },
    ]);
  });

  it("omits RSS alternates when RSS is disabled", () => {
    const metadata = buildPublicPageMetadata(
      { ...config, rssEnabled: false },
      {
        title: "Tags",
        description: "Explore tags",
        canonicalPath: "/tags",
      }
    );

    expect(metadata.alternates?.types?.["application/rss+xml"]).toBeUndefined();
    expect(metadata.alternates?.types?.["text/plain"]).toBeDefined();
  });

  it("uses asset publicUrl for og image when available", async () => {
    findAssetByIdMock.mockResolvedValueOnce({
      id: "asset-1",
      publicUrl: "/uploads/cover.png",
      altText: "Cover alt",
    });

    const resolved = await resolvePostSeoWithImages({
      bundle: makeBundle({ ogAssetId: "asset-1" }),
      config,
    });

    expect(resolved.ogImageUrl).toBe("https://example.com/uploads/cover.png");
    expect(resolved.ogImageAlt).toBe("Cover alt");
  });

  it("builds large-image metadata when ogImageUrl is present", () => {
    const bundle = makeBundle();
    const metadata = buildPostMetadata(
      {
        ...resolvePostSeo({ bundle, config }),
        ogImageUrl: "https://example.com/og.png",
        ogImageAlt: "OG alt",
      },
      bundle
    );

    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://example.com/og.png", alt: "OG alt" },
    ]);
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      siteName: "PostForge",
      publishedTime: "2026-06-14T12:00:00.000Z",
      modifiedTime: "2026-06-14T12:00:00.000Z",
      authors: ["https://example.com/"],
      tags: ["News"],
    });
  });

  it("includes category and keywords in JSON-LD", () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    const bundle = makeBundle();
    bundle.category = {
      id: "cat-1",
      name: "Guides",
      slug: "guides",
      description: null,
      createdAt: now,
      updatedAt: now,
    };
    const resolved = resolvePostSeo({ bundle, config });
    const jsonLd = buildBlogPostingJsonLd(bundle, resolved);

    expect(jsonLd.articleSection).toBe("Guides");
    expect(jsonLd.keywords).toBe("News");
    expect(jsonLd.author).toMatchObject({ name: "Post Author" });
    expect(jsonLd.publisher).toMatchObject({ name: "Post Publisher" });
  });

  it("supports absolute asset and default image URLs", async () => {
    findAssetByIdMock.mockResolvedValueOnce({
      id: "asset-1",
      publicUrl: "https://cdn.example.com/cover.png",
    });

    const withAbsoluteAsset = await resolvePostSeoWithImages({
      bundle: makeBundle({ ogAssetId: "asset-1" }),
      config,
    });
    expect(withAbsoluteAsset.ogImageUrl).toBe("https://cdn.example.com/cover.png");

    findAssetByIdMock.mockResolvedValueOnce(null);
    const withAbsoluteDefault = await resolvePostSeoWithImages({
      bundle: makeBundle(),
      config: { ...config, defaultSeoImage: "https://cdn.example.com/default.png" },
    });
    expect(withAbsoluteDefault.ogImageUrl).toBe("https://cdn.example.com/default.png");
  });

  it("falls back to the generated Open Graph route and site identity defaults", async () => {
    const genericConfig: BlogConfig = {
      ...config,
      defaultSeoImage: null,
      authorName: null,
      publisherName: null,
      language: undefined,
      locale: undefined,
    };

    const resolved = await resolvePostSeoWithImages({
      bundle: makeBundle(),
      config: genericConfig,
    });

    expect(resolved.ogImageUrl).toBe("https://example.com/opengraph-image");
    expect(resolved.ogImageAlt).toBe("PostForge social preview");
    expect(resolved.authorName).toBe("PostForge");
    expect(resolved.publisherName).toBe("PostForge");
    expect(resolved.language).toBe("en");
    expect(resolved.locale).toBe("en_US");
  });

  it("supports default image paths without a leading slash", async () => {
    const resolved = await resolvePostSeoWithImages({
      bundle: makeBundle(),
      config: { ...config, defaultSeoImage: "social.png" },
    });

    expect(resolved.ogImageUrl).toBe("https://example.com/social.png");
  });

  it("builds summary card metadata when no og image exists", () => {
    const bundle = makeBundle();
    const metadata = buildPostMetadata(resolvePostSeo({ bundle, config }), bundle);

    expect(metadata.twitter?.card).toBe("summary");
    expect(metadata.openGraph?.images).toBeUndefined();
  });

  it("builds website JSON-LD from generic site config", () => {
    const jsonLd = buildWebsiteJsonLd(config);

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      name: "PostForge",
      description: "A test blog",
      url: "https://example.com",
      publisher: {
        "@type": "Organization",
        name: "Post Publisher",
        url: "https://example.com",
      },
      inLanguage: "en",
    });
  });

  it("keeps breadcrumbs on the site base URL even with a custom canonical URL", () => {
    const bundle = makeBundle({
      canonicalUrl: "https://canonical.example.net/articles/hello",
    });
    bundle.category = {
      id: "cat-1",
      name: "Guides",
      slug: "guides",
      description: null,
      createdAt: new Date("2026-06-14T12:00:00.000Z"),
      updatedAt: new Date("2026-06-14T12:00:00.000Z"),
    };
    const resolved = resolvePostSeo({ bundle, config });
    const breadcrumb = buildArticleBreadcrumbJsonLd(bundle, resolved);

    expect(breadcrumb.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "PostForge",
        item: "https://example.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: "https://example.com/categories/guides",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Hello World",
        item: "https://example.com/blog/hello-world",
      },
    ]);
  });

  it("builds blog breadcrumbs for uncategorized articles", () => {
    const bundle = makeBundle();
    const resolved = resolvePostSeo({ bundle, config });
    const breadcrumb = buildArticleBreadcrumbJsonLd(bundle, resolved);

    expect(breadcrumb.itemListElement).toContainEqual({
      "@type": "ListItem",
      position: 2,
      name: "Blog",
      item: "https://example.com/blog",
    });
  });

  it("escapes JSON-LD safely", () => {
    expect(stringifyJsonLd({ value: "<script>" })).toBe('{"value":"\\u003cscript>"}');
  });
});
