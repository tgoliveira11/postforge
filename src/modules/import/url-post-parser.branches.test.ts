import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import {
  extractArticleMainImage,
  extractSlugFromUrl,
  findImageAfterPostDate,
  htmlToMarkdown,
  isElementBeforeInDocument,
  parseUrlPostHtml,
  resolveUrl,
  rewriteMarkdownImageUrl,
} from "@/modules/import/url-post-parser";

const LONG_BODY = "Long article body text. ".repeat(20);

describe("extractSlugFromUrl branches", () => {
  it("strips html extensions from the last path segment", () => {
    expect(extractSlugFromUrl("https://example.com/posts/my-post.html")).toBe("my-post");
    expect(extractSlugFromUrl("https://example.com/posts/my-post.markdown")).toBe("my-post");
  });

  it("uses imported-post when pathname has no segments", () => {
    expect(extractSlugFromUrl("https://example.com/")).toBe("imported-post");
  });

  it("normalizes markdown file extensions", () => {
    expect(extractSlugFromUrl("https://example.com/readme.md")).toBe("readme");
  });
});

describe("parseUrlPostHtml metadata branches", () => {
  it("uses twitter:title when h1 and og:title are missing", () => {
    const html = `<html><head><meta name="twitter:title" content="Twitter Title"></head><body><main><p>${LONG_BODY}</p></main></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.title).toBe("Twitter Title");
    expect(parsed.warnings).toContain("Title extracted from twitter:title");
  });

  it("uses document title when headings and social meta are missing", () => {
    const html = `<html><head><title>Document Title</title></head><body><main><p>${LONG_BODY}</p></main></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/my-slug/" });

    expect(parsed.title).toBe("Document Title");
    expect(parsed.warnings).toContain("Title extracted from document title");
  });

  it("derives title from the URL slug when no title metadata exists", () => {
    const html = `<html><body><main><p>${LONG_BODY}</p></main></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/my-cool-post/" });

    expect(parsed.title).toBe("my cool post");
    expect(parsed.warnings).toContain("Title derived from URL slug");
  });

  it("uses og:description for excerpt when subtitle is missing", () => {
    const html = `<html><head><meta property="og:description" content="OG description"></head><body><article><h1>Title</h1><p>${LONG_BODY}</p></article></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.excerpt).toBe("OG description");
    expect(parsed.warnings).toContain("Excerpt extracted from og:description");
  });

  it("uses the first long paragraph for excerpt when meta is missing", () => {
    const paragraph = "First paragraph with enough characters to qualify as excerpt. ".repeat(2);
    const html = `<html><body><article><h1>Title</h1><p>${paragraph}</p></article></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.excerpt).toContain("First paragraph");
    expect(parsed.warnings).toContain("Excerpt extracted from first paragraph");
  });

  it("warns when article content cannot be extracted", () => {
    const html = `<html><body><nav>${"Navigation only ".repeat(20)}</nav></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.warnings).toContain("No article content could be extracted from the page");
  });

  it("falls back to body when article containers are too short", () => {
    const html = `<html><body><article>Short</article><section><p>${LONG_BODY}</p></section></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.warnings).toContain("Article container not found; used page body fallback");
    expect(parsed.contentMarkdown).toContain("Long article body text");
  });

  it("includes canonical URL when present", () => {
    const html = `<html><head><link rel="canonical" href="https://example.com/canonical"></head><body><main><p>${LONG_BODY}</p></main></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.canonicalUrl).toBe("https://example.com/canonical");
  });
});

describe("parseUrlPostHtml image branches", () => {
  it("uses twitter:image when no article images exist", () => {
    const html = `<html><head><meta name="twitter:image" content="/images/twitter.png"></head><body><article><h1>Title</h1><p>${LONG_BODY}</p></article></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.mainImageUrl).toBe("https://example.com/images/twitter.png");
    expect(parsed.warnings).toContain("Main image extracted from twitter:image fallback");
  });

  it("warns when no main image can be found", () => {
    const html = `<html><body><article><h1>Title</h1><p>${LONG_BODY}</p></article></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.mainImageUrl).toBeNull();
    expect(parsed.warnings).toContain("No main image found");
  });

  it("extracts images from article headers after date metadata", () => {
    const html = `<article><header class="entry-header"><time datetime="2023-01-01">Jan 1</time></header><img src="https://example.com/header-img.png" width="400" height="200"><p>${LONG_BODY}</p></article>`;
    const $ = cheerio.load(html);
    const warnings: string[] = [];
    const img = extractArticleMainImage($, $("article"), "https://example.com/post/", warnings);

    expect(img).toBe("https://example.com/header-img.png");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("skips tiny decorative images and picks the next meaningful one", () => {
    const html = `<article><img src="https://example.com/tiny.png" width="16" height="16"><img src="https://example.com/real.png" width="400" height="200"><p>${LONG_BODY}</p></article>`;
    const $ = cheerio.load(html);
    const img = extractArticleMainImage($, $("article"), "https://example.com/post/", []);

    expect(img).toBe("https://example.com/real.png");
  });

  it("finds images in parent siblings when not adjacent to date metadata", () => {
    const html = `<article><div><p class="post-meta">Posted on Jan 1, 2023</p></div><div><img src="https://example.com/nearby.png" width="400" height="200"></div><p>${LONG_BODY}</p></article>`;
    const $ = cheerio.load(html);
    const img = findImageAfterPostDate($, $("article"), "https://example.com/post/");

    expect(img).toBe("https://example.com/nearby.png");
  });

  it("reads lazy-loaded data-src attributes", () => {
    const html = `<article><img data-src="https://example.com/lazy.png" width="400" height="200"><p>${LONG_BODY}</p></article>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.mainImageUrl).toBe("https://example.com/lazy.png");
  });

  it("uses data-original when src is missing", () => {
    const html = `<article><img data-original="https://example.com/original.png" width="400" height="200"><p>${LONG_BODY}</p></article>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.mainImageUrl).toBe("https://example.com/original.png");
  });

  it("skips nav images when searching article content", () => {
    const html = `<html><body><nav><img src="https://example.com/nav-logo.png" class="logo" width="400" height="200"></nav><article><h1>Title</h1><p>${LONG_BODY}</p></article></body></html>`;
    const parsed = parseUrlPostHtml({ html, finalUrl: "https://example.com/post/" });

    expect(parsed.mainImageUrl).toBeNull();
  });
});

describe("url post parser utility branches", () => {
  it("returns empty markdown for blank html", () => {
    expect(htmlToMarkdown("   ")).toBe("");
  });

  it("returns candidate url when base url is invalid", () => {
    expect(resolveUrl("not-a-url", "relative.png")).toBe("relative.png");
  });

  it("rewrites markdown image urls", () => {
    const markdown = "![alt](https://example.com/old.png)";
    expect(
      rewriteMarkdownImageUrl(markdown, "https://example.com/old.png", "/api/assets/new.png")
    ).toBe("![alt](/api/assets/new.png)");
  });

  it("treats detached nodes as before when after is not in the body node list", () => {
    const $ = cheerio.load("<body><span id='a'>A</span></body>");
    const a = $("#a").get(0)!;
    const detached = cheerio.load("<div id='b'>B</div>")("#b").get(0)!;

    expect(isElementBeforeInDocument($, a, detached)).toBe(true);
  });

  it("returns false when comparing non-element nodes", () => {
    const $ = cheerio.load("<body><span>A</span></body>");
    const textNode = $("span").contents().first().get(0)!;
    const span = $("span").get(0)!;

    expect(isElementBeforeInDocument($, textNode, span)).toBe(false);
  });
});
