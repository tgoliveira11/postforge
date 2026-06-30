import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectMock,
  fromMock,
  innerJoinMock,
  whereMock,
  orderByMock,
  limitMock,
  offsetMock,
} = vi.hoisted(() => {
  const offsetMock = vi.fn();
  const limitMock = vi.fn();
  const orderByMock = vi.fn();
  const whereMock = vi.fn();
  const innerJoinMock = vi.fn();
  const fromMock = vi.fn();
  const selectMock = vi.fn();

  return {
    selectMock,
    fromMock,
    innerJoinMock,
    whereMock,
    orderByMock,
    limitMock,
    offsetMock,
  };
});

vi.mock("@/db/get-db", () => ({
  db: { select: selectMock },
}));

import type { Post } from "@/modules/posts/posts.types";
import {
  countPublishedPosts,
  getPublishedNeighbors,
  listPublishedPostBundles,
  listPublishedPostsForFeed,
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

function mockListQuery(rows: Post[]) {
  orderByMock.mockReturnValueOnce({ limit: limitMock });
  offsetMock.mockResolvedValueOnce(rows);
}

function mockFeedQuery(rows: Post[]) {
  orderByMock.mockReturnValueOnce({ limit: limitMock });
  limitMock.mockResolvedValueOnce(rows);
}

function mockTagHydration() {
  orderByMock.mockResolvedValueOnce([]);
}

describe("public posts repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    offsetMock.mockResolvedValue([]);
    limitMock.mockReturnValue({ offset: offsetMock });
    orderByMock.mockReturnValue({ limit: limitMock });
    whereMock.mockReturnValue({ orderBy: orderByMock });
    innerJoinMock.mockReturnValue({ where: whereMock });
    fromMock.mockReturnValue({
      where: whereMock,
      innerJoin: innerJoinMock,
    });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("countPublishedPosts returns the db count", async () => {
    whereMock.mockResolvedValueOnce([{ count: 7 }]);

    await expect(countPublishedPosts()).resolves.toBe(7);
  });

  it("countPublishedPosts excludes a post when excludePostId is provided", async () => {
    whereMock.mockResolvedValueOnce([{ count: 2 }]);

    await expect(countPublishedPosts({ excludePostId: "post-1" })).resolves.toBe(2);
    expect(whereMock).toHaveBeenCalled();
  });

  it("listPublishedPostBundles hydrates tags for each post", async () => {
    const post = makePost("post-1");
    mockListQuery([post]);
    mockTagHydration();

    const bundles = await listPublishedPostBundles({ limit: 5, offset: 0 });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.post.id).toBe("post-1");
    expect(bundles[0]?.tags).toEqual([]);
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(offsetMock).toHaveBeenCalledWith(0);
  });

  it("getPublishedNeighbors returns previous and next posts in listing order", async () => {
    const posts = [
      makePost("post-a", { publicOrder: 0 }),
      makePost("post-b", { publicOrder: 1 }),
      makePost("post-c", { publicOrder: 2 }),
    ];
    orderByMock.mockResolvedValueOnce(posts);

    await expect(getPublishedNeighbors("post-b")).resolves.toEqual({
      previous: posts[0],
      next: posts[2],
    });
  });

  it("listPublishedPostsForFeed returns hydrated bundles up to the limit", async () => {
    const post = makePost("feed-1");
    mockFeedQuery([post]);
    mockTagHydration();

    const bundles = await listPublishedPostsForFeed(10);

    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.post.id).toBe("feed-1");
    expect(limitMock).toHaveBeenCalledWith(10);
  });
});
