import { beforeEach, describe, expect, it, vi } from "vitest";

function createChain(result: unknown, terminal: "limit" | "offset" | "orderBy" | "where" = "limit") {
  const terminalMock = vi.fn().mockResolvedValue(result);
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => chain;
  for (const method of ["from", "where", "orderBy", "groupBy", "innerJoin", "leftJoin", "limit", "offset"]) {
    chain[method] = vi.fn(self);
  }
  chain[terminal] = terminalMock;
  return chain;
}

const selectMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/get-db", () => ({
  db: { select: selectMock },
}));

import type { Post } from "@/modules/posts/posts.types";
import {
  findAssetById,
  getPublishedPostBundleBySlug,
  listAllCategories,
  listAllTags,
  listPopularCategories,
  listPopularTags,
  listPublicCategories,
  listPublicTags,
  listPublishedPostBundlesByCategorySlug,
  listPublishedPostBundlesByTagSlug,
  listPublishedPostBundlesPaginated,
  listPublishedPostsWithPublicOrder,
  listPublishedSlugs,
  searchPublishedPostBundles,
} from "@/modules/public/public-posts.repository";

function makePost(id: string, overrides: Partial<Post> = {}): Post {
  const now = new Date("2026-06-14T12:00:00.000Z");
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
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
    ...overrides,
  };
}

describe("public posts repository extended", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPublishedPostBundlesPaginated returns paginated bundles", async () => {
    const post = makePost("post-1");
    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain([post], "offset")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([{ count: 1 }], "where")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([], "orderBy")) });

    const result = await listPublishedPostBundlesPaginated({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.totalItems).toBe(1);
  });

  it("getPublishedPostBundleBySlug returns null when missing", async () => {
    selectMock.mockReturnValueOnce({ from: vi.fn(() => createChain([], "limit")) });

    await expect(getPublishedPostBundleBySlug("missing")).resolves.toBeNull();
  });

  it("getPublishedPostBundleBySlug hydrates a bundle", async () => {
    const post = makePost("post-1");
    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain([post], "limit")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([], "orderBy")) });

    const bundle = await getPublishedPostBundleBySlug("post-post-1");

    expect(bundle?.post.id).toBe("post-1");
  });

  it("searchPublishedPostBundles returns empty for blank query", async () => {
    await expect(searchPublishedPostBundles("   ")).resolves.toEqual([]);
  });

  it("searchPublishedPostBundles hydrates search results", async () => {
    const post = makePost("post-1");
    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain([post], "offset")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([], "orderBy")) });

    const bundles = await searchPublishedPostBundles("hello");

    expect(bundles).toHaveLength(1);
  });

  it("listPublishedPostBundlesByCategorySlug returns null when category missing", async () => {
    selectMock.mockReturnValueOnce({ from: vi.fn(() => createChain([], "limit")) });

    await expect(listPublishedPostBundlesByCategorySlug("missing")).resolves.toBeNull();
  });

  it("listPublishedPostBundlesByCategorySlug returns category and posts", async () => {
    const category = {
      id: "cat-1",
      name: "Engineering",
      slug: "engineering",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const post = makePost("post-1", { categoryId: "cat-1" });

    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain([category], "limit")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([post], "offset")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([], "orderBy")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([], "orderBy")) });

    const result = await listPublishedPostBundlesByCategorySlug("engineering");

    expect(result?.category).toEqual(category);
    expect(result?.posts).toHaveLength(1);
  });

  it("listPublishedPostBundlesByTagSlug returns null when tag missing", async () => {
    selectMock.mockReturnValueOnce({ from: vi.fn(() => createChain([], "limit")) });

    await expect(listPublishedPostBundlesByTagSlug("missing")).resolves.toBeNull();
  });

  it("listPublishedPostBundlesByTagSlug returns tag and posts", async () => {
    const tag = {
      id: "tag-1",
      name: "TypeScript",
      slug: "typescript",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const post = makePost("post-1");

    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain([tag], "limit")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([{ post }], "offset")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain([], "orderBy")) });

    const result = await listPublishedPostBundlesByTagSlug("typescript");

    expect(result?.tag).toEqual(tag);
    expect(result?.posts).toHaveLength(1);
  });

  it("listPublicTags and listPopularTags slice results", async () => {
    const rows = [
      { id: "tag-1", name: "A", slug: "a", postCount: 3, createdAt: new Date(), updatedAt: new Date() },
      { id: "tag-2", name: "B", slug: "b", postCount: 2, createdAt: new Date(), updatedAt: new Date() },
    ];
    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain(rows, "orderBy")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain(rows, "orderBy")) });

    const all = await listPublicTags();
    expect(all).toHaveLength(2);

    const popular = await listPopularTags(1);
    expect(popular).toHaveLength(1);
  });

  it("listPublicCategories and listPopularCategories slice results", async () => {
    const rows = [
      {
        id: "cat-1",
        name: "A",
        slug: "a",
        description: null,
        postCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain(rows, "orderBy")) })
      .mockReturnValueOnce({ from: vi.fn(() => createChain(rows, "orderBy")) });

    const all = await listPublicCategories();
    expect(all).toHaveLength(1);

    const popular = await listPopularCategories(1);
    expect(popular).toHaveLength(1);
  });

  it("listAllTags and listAllCategories return ordered rows", async () => {
    selectMock
      .mockReturnValueOnce({ from: vi.fn(() => createChain([{ id: "tag-1", name: "A", slug: "a" }], "orderBy")) })
      .mockReturnValueOnce({
        from: vi.fn(() =>
          createChain([{ id: "cat-1", name: "A", slug: "a", description: null }], "orderBy")
        ),
      });

    await expect(listAllTags()).resolves.toHaveLength(1);
    await expect(listAllCategories()).resolves.toHaveLength(1);
  });

  it("listPublishedSlugs returns slug rows", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([{ slug: "hello", updatedAt: new Date() }], "orderBy")),
    });

    await expect(listPublishedSlugs()).resolves.toEqual([
      { slug: "hello", updatedAt: expect.any(Date) },
    ]);
  });

  it("listPublishedPostsWithPublicOrder returns ordered posts", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([makePost("post-1", { publicOrder: 1 })], "orderBy")),
    });

    await expect(listPublishedPostsWithPublicOrder()).resolves.toHaveLength(1);
  });

  it("findAssetById returns null when missing", async () => {
    selectMock.mockReturnValueOnce({ from: vi.fn(() => createChain([], "limit")) });

    await expect(findAssetById("missing")).resolves.toBeNull();
  });

  it("findAssetById returns an asset", async () => {
    const asset = { id: "asset-1", postId: "post-1" };
    selectMock.mockReturnValueOnce({ from: vi.fn(() => createChain([asset], "limit")) });

    await expect(findAssetById("asset-1")).resolves.toEqual(asset);
  });
});
