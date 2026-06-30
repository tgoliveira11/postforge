import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  findPostByIdMock: vi.fn(),
  findPostBySlugMock: vi.fn(),
  findPublishedPostBySlugMock: vi.fn(),
  updatePostByIdMock: vi.fn(),
  insertPostMock: vi.fn(),
  insertPostRevisionMock: vi.fn(),
  slugExistsMock: vi.fn(),
}));

const tagMocks = vi.hoisted(() => ({
  syncPostTagsMock: vi.fn(),
  getTagIdsForPostMock: vi.fn(),
}));

const assetMocks = vi.hoisted(() => ({
  assertAssetBelongsToPostMock: vi.fn(),
}));

vi.mock("@/modules/posts/posts.repository", () => ({
  findPostById: repoMocks.findPostByIdMock,
  findPostBySlug: repoMocks.findPostBySlugMock,
  findPublishedPostBySlug: repoMocks.findPublishedPostBySlugMock,
  updatePostById: repoMocks.updatePostByIdMock,
  insertPost: repoMocks.insertPostMock,
  insertPostRevision: repoMocks.insertPostRevisionMock,
  slugExists: repoMocks.slugExistsMock,
  listPublishedPostsWithPublicOrder: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/modules/posts/post-tags.repository", () => ({
  syncPostTags: tagMocks.syncPostTagsMock,
  getTagIdsForPost: tagMocks.getTagIdsForPostMock,
}));

vi.mock("@/modules/assets/assets.service", () => ({
  assertAssetBelongsToPost: assetMocks.assertAssetBelongsToPostMock,
}));

vi.mock("@/modules/markdown/markdown-renderer", () => ({
  renderMarkdownToHtml: vi.fn().mockResolvedValue("<p>html</p>"),
}));

import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  archivePost,
  clearPostPublicOrder,
  duplicatePost,
  getById,
  getBySlug,
  getPublishedBySlug,
  listPublishedPostsWithPublicOrder,
  markFeatured,
  movePostPublicOrder,
  pinPost,
  publishPost,
  schedulePost,
  setPostPublicOrder,
  unmarkFeatured,
  unpublishPost,
  unpinPost,
  updateDraft,
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

describe("posts service error branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.slugExistsMock.mockResolvedValue(false);
    repoMocks.findPostByIdMock.mockResolvedValue(makePost());
    repoMocks.updatePostByIdMock.mockImplementation(async (_id, values) => ({
      ...makePost(),
      ...values,
    }));
    repoMocks.insertPostRevisionMock.mockResolvedValue({});
    repoMocks.insertPostMock.mockImplementation(async (values) => ({ ...makePost(), ...values }));
    tagMocks.syncPostTagsMock.mockResolvedValue(undefined);
    tagMocks.getTagIdsForPostMock.mockResolvedValue([]);
    assetMocks.assertAssetBelongsToPostMock.mockResolvedValue(undefined);
  });

  it("updateDraft rejects invalid slugs", async () => {
    await expect(updateDraft(postId, { slug: "---" }, userId)).rejects.toThrow(/slug/i);
  });

  it("updateDraft wraps non-error tag sync failures", async () => {
    tagMocks.syncPostTagsMock.mockRejectedValueOnce("bad tags");

    await expect(
      updateDraft(postId, { tagIds: ["00000000-0000-4000-8000-000000000002"] }, userId)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("getById throws when post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(getById(postId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getBySlug throws when post is missing", async () => {
    repoMocks.findPostBySlugMock.mockResolvedValueOnce(undefined);

    await expect(getBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getPublishedBySlug throws when published post is missing", async () => {
    repoMocks.findPublishedPostBySlugMock.mockResolvedValueOnce(undefined);

    await expect(getPublishedBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("publishPost wraps non-error validation failures", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(
      makePost({ title: "", slug: "valid-slug", contentMarkdown: "Body" })
    );

    await expect(publishPost(postId, userId)).rejects.toBeInstanceOf(ValidationError);
  });

  it("publishPost throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(publishPost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("unpublishPost throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(unpublishPost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("schedulePost wraps non-error schedule validation failures", async () => {
    await expect(
      schedulePost(postId, userId, { scheduledAt: new Date(Date.now() - 60_000) })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("schedulePost throws when post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(
      schedulePost(postId, userId, { scheduledAt: new Date(Date.now() + 86_400_000) })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("schedulePost wraps non-error publish validation failures", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(
      makePost({ title: "Title", slug: "bad slug", contentMarkdown: "Body" })
    );

    await expect(
      schedulePost(postId, userId, { scheduledAt: new Date(Date.now() + 86_400_000) })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("schedulePost throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(
      schedulePost(postId, userId, { scheduledAt: new Date(Date.now() + 86_400_000) })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("archivePost throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(archivePost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("duplicatePost throws when source post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(duplicatePost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("markFeatured throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(markFeatured(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("unmarkFeatured throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(unmarkFeatured(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("pinPost throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(pinPost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("unpinPost throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(unpinPost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("setPostPublicOrder throws when post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(setPostPublicOrder(postId, userId, { publicOrder: 2 })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("setPostPublicOrder throws when update returns nothing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(makePost({ status: "published" }));
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(setPostPublicOrder(postId, userId, { publicOrder: 2 })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("clearPostPublicOrder throws when post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(clearPostPublicOrder(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("clearPostPublicOrder throws when update returns nothing", async () => {
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(clearPostPublicOrder(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("movePostPublicOrder throws when post is missing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(movePostPublicOrder(postId, userId, "up")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("movePostPublicOrder throws when update returns nothing", async () => {
    repoMocks.findPostByIdMock.mockResolvedValueOnce(makePost({ status: "published", publicOrder: 2 }));
    repoMocks.updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(movePostPublicOrder(postId, userId, "up")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("listPublishedPostsWithPublicOrder delegates to repository", async () => {
    await expect(listPublishedPostsWithPublicOrder()).resolves.toEqual([]);
  });
});
