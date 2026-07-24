import { describe, expect, it } from "vitest";
import type { Asset } from "@/modules/assets/assets.types";
import type { Category } from "@/modules/categories/categories.types";
import type { Post } from "@/modules/posts/posts.types";
import type { Redirect } from "@/modules/redirects/redirects.types";
import type { Tag } from "@/modules/tags/tags.types";
import {
  extractContentReferences,
  validateContentRows,
  type ContentValidationRows,
} from "./validate-content";

const now = new Date("2026-06-14T12:00:00.000Z");

const category: Category = {
  id: "cat-1",
  name: "Guides",
  slug: "guides",
  description: "How-to articles",
  createdAt: now,
  updatedAt: now,
};

const tag: Tag = {
  id: "tag-1",
  name: "Release",
  slug: "release",
  createdAt: now,
  updatedAt: now,
};

const asset: Asset = {
  id: "asset-1",
  postId: "post-1",
  storageProvider: "local",
  storageKey: "posts/post-1/cover.png",
  publicUrl: "/api/assets/posts/post-1/cover.png",
  originalFilename: "cover.png",
  safeFilename: "cover.png",
  mimeType: "image/png",
  fileSizeBytes: 100,
  width: 1200,
  height: 630,
  altText: "Cover image",
  caption: null,
  hash: null,
  createdBy: "user-1",
  createdAt: now,
  updatedAt: now,
};

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    title: "Hello World",
    slug: "hello-world",
    excerpt: "A useful post",
    contentMarkdown: "[Search](/search)\n\n![Cover](/api/assets/posts/post-1/cover.png)",
    contentHtmlCache: null,
    coverAssetId: "asset-1",
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
    ...overrides,
  };
}

function makeRedirect(overrides: Partial<Redirect> = {}): Redirect {
  return {
    id: "redirect-1",
    sourcePath: "/old-post",
    targetPath: "/blog/hello-world",
    statusCode: 301,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRows(overrides: Partial<ContentValidationRows> = {}): ContentValidationRows {
  return {
    posts: [makePost()],
    categories: [category],
    tags: [tag],
    postTags: [{ postId: "post-1", tagId: "tag-1" }],
    assets: [asset],
    redirects: [makeRedirect()],
    ...overrides,
  };
}

describe("content validation helpers", () => {
  it("extracts markdown and HTML references with image alt warnings", () => {
    const references = extractContentReferences(
      "[Post](/blog/hello-world)\n\n![](/missing-alt.png)\n\n<img src=\"/inline.png\">"
    );

    expect(references.links).toEqual([
      "/blog/hello-world",
      "/missing-alt.png",
      "/inline.png",
    ]);
    expect(references.imageAltIssues).toHaveLength(2);
  });

  it("passes valid published content", () => {
    const result = validateContentRows(makeRows(), { baseUrl: "https://example.com" });

    expect(result.checked.posts).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it("reports content, redirect, and canonical problems", () => {
    const result = validateContentRows(
      makeRows({
        posts: [
          makePost({
            excerpt: null,
            contentMarkdown: "Broken [link](/not-public) and ![](/missing.png)",
            canonicalUrl: "not-a-url",
          }),
          makePost({
            id: "post-2",
            slug: "second-post",
            canonicalUrl: "https://example.com/blog/hello-world",
          }),
        ],
        redirects: [makeRedirect({ sourcePath: "old", targetPath: "old", statusCode: 200 })],
      }),
      { baseUrl: "https://example.com" }
    );

    const messages = result.issues.map((issue) => issue.message);
    expect(messages).toContain('Invalid canonical URL "not-a-url".');
    expect(messages).toContain("Published post is missing an excerpt or SEO description.");
    expect(messages).toContain("Broken or non-public internal reference: /not-public");
    expect(messages).toContain('Redirect source must start with "/": old.');
    expect(messages).toContain("Redirect old has invalid status 200.");
    expect(result.issues.some((issue) => issue.message.includes("missing alt text"))).toBe(true);
  });

  it("does not fail public content checks for draft body work in progress", () => {
    const result = validateContentRows(
      makeRows({
        posts: [
          makePost({
            status: "draft",
            excerpt: null,
            contentMarkdown: "Draft [todo](/not-public) and ![](/missing.png)",
            coverAssetId: null,
            publishedAt: null,
          }),
        ],
        postTags: [],
        redirects: [],
      }),
      { baseUrl: "https://example.com" }
    );

    expect(result.issues).toEqual([]);
  });
});
