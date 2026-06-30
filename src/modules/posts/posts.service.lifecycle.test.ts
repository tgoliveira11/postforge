import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  findPostByIdMock: vi.fn(),
  insertPostMock: vi.fn(),
  insertPostRevisionMock: vi.fn(),
  slugExistsMock: vi.fn(),
  updatePostByIdMock: vi.fn(),
  listAdminPostsMock: vi.fn(),
  countPostsByStatusMock: vi.fn(),
  countAllPostsMock: vi.fn(),
  findCategoryByIdMock: vi.fn(),
  listPublishedPostsMock: vi.fn(),
  listPublishedPostsWithPublicOrderMock: vi.fn(),
}));

const tagMocks = vi.hoisted(() => ({
  syncPostTagsMock: vi.fn(),
  getTagIdsForPostMock: vi.fn(),
}));

vi.mock("@/modules/posts/posts.repository", () => ({
  findPostById: repoMocks.findPostByIdMock,
  insertPost: repoMocks.insertPostMock,
  insertPostRevision: repoMocks.insertPostRevisionMock,
  slugExists: repoMocks.slugExistsMock,
  updatePostById: repoMocks.updatePostByIdMock,
  listAdminPosts: repoMocks.listAdminPostsMock,
  countPostsByStatus: repoMocks.countPostsByStatusMock,
  countAllPosts: repoMocks.countAllPostsMock,
  findCategoryById: repoMocks.findCategoryByIdMock,
  listPublishedPosts: repoMocks.listPublishedPostsMock,
  listPublishedPostsWithPublicOrder: repoMocks.listPublishedPostsWithPublicOrderMock,
}));

vi.mock("@/modules/posts/post-tags.repository", () => ({
  syncPostTags: tagMocks.syncPostTagsMock,
  getTagIdsForPost: tagMocks.getTagIdsForPostMock,
}));

vi.mock("@/modules/markdown/markdown-renderer", () => ({
  renderMarkdownToHtml: vi.fn().mockResolvedValue("<p>html</p>"),
}));

import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  clearPostPublicOrder,
  duplicatePost,
  getAdminPostBundle,
  getDashboardStats,
  listPublishedPosts,
  markFeatured,
  movePostPublicOrder,
  pinPost,
  schedulePost,
  setPostPublicOrder,
  unmarkFeatured,
  unpinPost,
} from "@/modules/posts/posts.service";
import type { Post } from "@/modules/posts/posts.types";

const postId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000099";

function makePost(overrides: Partial<Post> = {}): Post {
  const now = new Date();
  return {
    id: postId,
    title: "Hello World",
    slug: "hello-world",
    excerpt: null,
    contentMarkdown: "Body content",
    contentHtmlCache: null,
    coverAssetId: null,
    ogAssetId: null,
    status: "draft",
    featured: false,
    pinned: false,
    pinnedPriority: 0,
    publicOrder: 0,
    categoryId: null,
    publishedAt: null,
    scheduledAt: null,
    unpublishedAt: null,
    seoTitle: null,
    seoDescription: null,
    canonicalUrl: null,
    ogTitle: null,
    ogDescription: null,
    readingTimeMinutes: null,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("posts service lifecycle helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.slugExistsMock.mockResolvedValue(false);
    repoMocks.findPostByIdMock.mockResolvedValue(makePost());
    repoMocks.updatePostByIdMock.mockImplementation(async (_id, values) => ({
      ...makePost(),
      ...values,
    }));
    repoMocks.insertPostMock.mockImplementation(async (values) => ({ ...makePost(), ...values }));
    repoMocks.insertPostRevisionMock.mockResolvedValue({});
    tagMocks.syncPostTagsMock.mockResolvedValue(undefined);
    tagMocks.getTagIdsForPostMock.mockResolvedValue(["tag-1"]);
    repoMocks.listAdminPostsMock.mockResolvedValue([makePost()]);
    repoMocks.countPostsByStatusMock.mockResolvedValue({
      draft: 1,
      scheduled: 0,
      published: 2,
      unpublished: 0,
      archived: 0,
    });
    repoMocks.countAllPostsMock.mockResolvedValue(3);
    repoMocks.findCategoryByIdMock.mockResolvedValue({
      id: "cat-1",
      name: "Engineering",
      slug: "engineering",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repoMocks.listPublishedPostsMock.mockResolvedValue([makePost({ status: "published" })]);
    repoMocks.listPublishedPostsWithPublicOrderMock.mockResolvedValue([]);
  });

  it("schedulePost schedules a publishable post", async () => {
    const scheduledAt = new Date(Date.now() + 86_400_000);

    const post = await schedulePost(postId, userId, { scheduledAt });

    expect(post.status).toBe("scheduled");
    expect(repoMocks.updatePostByIdMock).toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ status: "scheduled", scheduledAt })
    );
  });

  it("schedulePost rejects past dates", async () => {
    await expect(
      schedulePost(postId, userId, { scheduledAt: new Date(Date.now() - 60_000) })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("markFeatured and unmarkFeatured update featured flag", async () => {
    await expect(markFeatured(postId, userId)).resolves.toMatchObject({ featured: true });
    await expect(unmarkFeatured(postId, userId)).resolves.toMatchObject({ featured: false });
  });

  it("pinPost and unpinPost update pin state", async () => {
    await expect(pinPost(postId, userId, { pinnedPriority: 3 })).resolves.toMatchObject({
      pinned: true,
      pinnedPriority: 3,
    });
    await expect(unpinPost(postId, userId)).resolves.toMatchObject({
      pinned: false,
      pinnedPriority: 0,
    });
  });

  it("duplicatePost copies content and tags", async () => {
    const copy = await duplicatePost(postId, userId);

    expect(copy.title).toContain("(Copy)");
    expect(tagMocks.syncPostTagsMock).toHaveBeenCalledWith(copy.id, ["tag-1"]);
  });

  it("setPostPublicOrder requires published posts", async () => {
    await expect(setPostPublicOrder(postId, userId, { publicOrder: 2 })).rejects.toBeInstanceOf(
      ValidationError
    );

    repoMocks.findPostByIdMock.mockResolvedValueOnce(makePost({ status: "published" }));

    await expect(setPostPublicOrder(postId, userId, { publicOrder: 2 })).resolves.toMatchObject({
      publicOrder: 2,
    });
  });

  it("clearPostPublicOrder resets public order", async () => {
    await expect(clearPostPublicOrder(postId, userId)).resolves.toMatchObject({ publicOrder: 0 });
  });

  it("movePostPublicOrder no-ops at lower bound", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(
      makePost({ status: "published", publicOrder: 0 })
    );

    const post = await movePostPublicOrder(postId, userId, "up");

    expect(post.publicOrder).toBe(0);
    expect(repoMocks.updatePostByIdMock).not.toHaveBeenCalled();
  });

  it("movePostPublicOrder moves published posts down", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(
      makePost({ status: "published", publicOrder: 1 })
    );

    await expect(movePostPublicOrder(postId, userId, "down")).resolves.toMatchObject({
      publicOrder: 2,
    });
  });

  it("movePostPublicOrder no-ops at upper bound", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(
      makePost({ status: "published", publicOrder: 9999 })
    );

    const post = await movePostPublicOrder(postId, userId, "down");

    expect(post.publicOrder).toBe(9999);
    expect(repoMocks.updatePostByIdMock).not.toHaveBeenCalled();
  });

  it("getAdminPostBundle returns category and tag ids", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(
      makePost({ categoryId: "00000000-0000-4000-8000-000000000003" })
    );

    const bundle = await getAdminPostBundle(postId);

    expect(bundle.post.id).toBe(postId);
    expect(bundle.category?.slug).toBe("engineering");
    expect(bundle.tagIds).toEqual(["tag-1"]);
  });

  it("getAdminPostBundle throws when post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(getAdminPostBundle(postId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getDashboardStats aggregates counts and recent posts", async () => {
    const stats = await getDashboardStats();

    expect(stats.total).toBe(3);
    expect(stats.counts.published).toBe(2);
    expect(stats.recent).toHaveLength(1);
  });

  it("listPublishedPosts delegates to repository", async () => {
    await expect(listPublishedPosts({ limit: 5 })).resolves.toHaveLength(1);
    expect(repoMocks.listPublishedPostsMock).toHaveBeenCalledWith({ limit: 5 });
  });
});
