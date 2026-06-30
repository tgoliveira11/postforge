import { beforeEach, describe, expect, it, vi } from "vitest";

const { renderMarkdownToHtmlMock } = vi.hoisted(() => ({
  renderMarkdownToHtmlMock: vi.fn(),
}));

vi.mock("@/modules/markdown/markdown-renderer", () => ({
  renderMarkdownToHtml: renderMarkdownToHtmlMock,
}));

import { getPostHtmlContent } from "@/modules/public/post-content";
import type { Post } from "@/modules/posts/posts.types";

function makePost(overrides: Partial<Post> = {}): Post {
  const now = new Date("2026-06-14T12:00:00.000Z");
  return {
    id: "post-1",
    title: "Hello",
    slug: "hello",
    excerpt: "Excerpt",
    contentMarkdown: "# Heading",
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
    ...overrides,
  };
}

describe("post content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderMarkdownToHtmlMock.mockResolvedValue("<h1>Heading</h1>");
  });

  it("returns cached HTML when contentHtmlCache is present", async () => {
    const post = makePost({ contentHtmlCache: "<p>Cached</p>", contentMarkdown: "# Other" });

    await expect(getPostHtmlContent(post)).resolves.toBe("<p>Cached</p>");
    expect(renderMarkdownToHtmlMock).not.toHaveBeenCalled();
  });

  it("renders markdown when cache is empty or whitespace", async () => {
    const post = makePost({ contentHtmlCache: "   ", contentMarkdown: "# Heading" });

    await expect(getPostHtmlContent(post)).resolves.toBe("<h1>Heading</h1>");
    expect(renderMarkdownToHtmlMock).toHaveBeenCalledWith("# Heading");
  });
});
