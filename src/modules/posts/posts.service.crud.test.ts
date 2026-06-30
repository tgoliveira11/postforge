import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findPostByIdMock,
  insertPostMock,
  insertPostRevisionMock,
  slugExistsMock,
  updatePostByIdMock,
  findPostBySlugMock,
  findPublishedPostBySlugMock,
} = vi.hoisted(() => ({
  findPostByIdMock: vi.fn(),
  insertPostMock: vi.fn(),
  insertPostRevisionMock: vi.fn(),
  slugExistsMock: vi.fn(),
  updatePostByIdMock: vi.fn(),
  findPostBySlugMock: vi.fn(),
  findPublishedPostBySlugMock: vi.fn(),
}));

const { syncPostTagsMock } = vi.hoisted(() => ({
  syncPostTagsMock: vi.fn(),
}));

const { createRedirectMock } = vi.hoisted(() => ({
  createRedirectMock: vi.fn(),
}));

const { assertAssetBelongsToPostMock } = vi.hoisted(() => ({
  assertAssetBelongsToPostMock: vi.fn(),
}));

vi.mock("@/modules/posts/posts.repository", () => ({
  findPostById: findPostByIdMock,
  insertPost: insertPostMock,
  insertPostRevision: insertPostRevisionMock,
  slugExists: slugExistsMock,
  updatePostById: updatePostByIdMock,
  findPostBySlug: findPostBySlugMock,
  findPublishedPostBySlug: findPublishedPostBySlugMock,
}));

vi.mock("@/modules/posts/post-tags.repository", () => ({
  syncPostTags: syncPostTagsMock,
  getTagIdsForPost: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/modules/redirects/redirects.service", () => ({
  createRedirect: createRedirectMock,
}));

vi.mock("@/modules/assets/assets.service", () => ({
  assertAssetBelongsToPost: assertAssetBelongsToPostMock,
}));

vi.mock("@/modules/markdown/markdown-renderer", () => ({
  renderMarkdownToHtml: vi.fn().mockResolvedValue("<p>html</p>"),
}));

import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  archivePost,
  createDraft,
  getById,
  getBySlug,
  getPublishedBySlug,
  publishPost,
  unpublishPost,
  updateDraft,
} from "@/modules/posts/posts.service";
import type { Post } from "@/modules/posts/posts.types";

const postId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000099";
const tagId = "00000000-0000-4000-8000-000000000002";
const categoryId = "00000000-0000-4000-8000-000000000003";

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

describe("posts service CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    slugExistsMock.mockResolvedValue(false);
    insertPostMock.mockImplementation(async (values) => ({ ...makePost(), ...values, id: postId }));
    updatePostByIdMock.mockImplementation(async (id, values) => ({ ...makePost(), ...values, id }));
    insertPostRevisionMock.mockResolvedValue({});
    syncPostTagsMock.mockResolvedValue(undefined);
    createRedirectMock.mockResolvedValue(undefined);
    assertAssetBelongsToPostMock.mockResolvedValue(undefined);
  });

  describe("createDraft", () => {
    it("inserts a draft with a generated slug and syncs tags", async () => {
      const post = await createDraft(
        { title: "Hello World", contentMarkdown: "Draft body", tagIds: [tagId] },
        userId
      );

      expect(insertPostMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Hello World",
          slug: "hello-world",
          status: "draft",
          contentMarkdown: "Draft body",
          createdBy: userId,
          updatedBy: userId,
        })
      );
      expect(syncPostTagsMock).toHaveBeenCalledWith(postId, [tagId]);
      expect(post.slug).toBe("hello-world");
    });

    it("appends a numeric suffix when the slug already exists", async () => {
      slugExistsMock.mockResolvedValueOnce(true).mockResolvedValue(false);

      await createDraft({ title: "Hello World" }, userId);

      expect(insertPostMock).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "hello-world-2" })
      );
    });
  });

  describe("updateDraft", () => {
    it("throws NotFoundError when the post does not exist", async () => {
      findPostByIdMock.mockResolvedValue(undefined);

      await expect(updateDraft(postId, { title: "Updated" }, userId)).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(updatePostByIdMock).not.toHaveBeenCalled();
    });

    it("creates a slug redirect when a published post slug changes", async () => {
      findPostByIdMock.mockResolvedValue(
        makePost({ status: "published", slug: "old-slug", publishedAt: new Date() })
      );

      await updateDraft(postId, { slug: "new-slug" }, userId);

      expect(createRedirectMock).toHaveBeenCalledWith({
        sourcePath: "/blog/old-slug",
        targetPath: "/blog/new-slug",
        statusCode: 301,
      });
    });

    it("does not create a redirect for draft slug changes", async () => {
      findPostByIdMock.mockResolvedValue(makePost({ status: "draft", slug: "old-slug" }));

      await updateDraft(postId, { slug: "new-slug" }, userId);

      expect(createRedirectMock).not.toHaveBeenCalled();
    });
  });

  describe("publishPost", () => {
    it("publishes a valid draft and records a revision", async () => {
      findPostByIdMock.mockResolvedValue(makePost());

      const published = await publishPost(postId, userId);

      expect(updatePostByIdMock).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({ status: "published" })
      );
      expect(insertPostRevisionMock).toHaveBeenCalledWith(
        expect.objectContaining({ postId, revisionType: "publish", createdBy: userId })
      );
      expect(published.status).toBe("published");
    });

    it("throws NotFoundError when the post does not exist", async () => {
      findPostByIdMock.mockResolvedValue(undefined);

      await expect(publishPost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("unpublishPost", () => {
    it("marks a post as unpublished and records a revision", async () => {
      findPostByIdMock.mockResolvedValue(makePost({ status: "published", publishedAt: new Date() }));

      const result = await unpublishPost(postId, userId);

      expect(updatePostByIdMock).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({ status: "unpublished" })
      );
      expect(insertPostRevisionMock).toHaveBeenCalledWith(
        expect.objectContaining({ revisionType: "unpublish" })
      );
      expect(result.status).toBe("unpublished");
    });

    it("throws NotFoundError when the post does not exist", async () => {
      findPostByIdMock.mockResolvedValue(undefined);

      await expect(unpublishPost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("archivePost", () => {
    it("archives a post", async () => {
      updatePostByIdMock.mockResolvedValue(makePost({ status: "archived" }));

      const result = await archivePost(postId, userId);

      expect(updatePostByIdMock).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({ status: "archived", updatedBy: userId })
      );
      expect(result.status).toBe("archived");
    });

    it("throws NotFoundError when update returns nothing", async () => {
      updatePostByIdMock.mockResolvedValue(undefined);

      await expect(archivePost(postId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getById", () => {
    it("throws NotFoundError when the post is missing", async () => {
      findPostByIdMock.mockResolvedValue(undefined);

      await expect(getById(postId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateDraft extended branches", () => {
    it("updates optional metadata fields and creates a revision", async () => {
      findPostByIdMock.mockResolvedValue(makePost());

      await updateDraft(
        postId,
        {
          title: "Updated",
          excerpt: "Excerpt",
          categoryId,
          coverAssetId: "00000000-0000-4000-8000-000000000010",
          ogAssetId: "00000000-0000-4000-8000-000000000011",
          seoTitle: "SEO",
          seoDescription: "SEO desc",
          canonicalUrl: "https://example.com/post",
          ogTitle: "OG",
          ogDescription: "OG desc",
          featured: true,
          pinned: true,
          pinnedPriority: 2,
          contentMarkdown: "# Updated",
          createRevision: true,
          tagIds: [tagId],
        },
        userId
      );

      expect(assertAssetBelongsToPostMock).toHaveBeenCalledTimes(2);
      expect(insertPostRevisionMock).toHaveBeenCalled();
      expect(syncPostTagsMock).toHaveBeenCalledWith(postId, [tagId]);
    });

    it("resets pinned priority when unpinned", async () => {
      findPostByIdMock.mockResolvedValue(makePost({ pinned: true, pinnedPriority: 5 }));

      await updateDraft(postId, { pinned: false }, userId);

      expect(updatePostByIdMock).toHaveBeenCalledWith(
        postId,
        expect.objectContaining({ pinned: false, pinnedPriority: 0 })
      );
    });

    it("wraps tag sync failures as validation errors", async () => {
      findPostByIdMock.mockResolvedValue(makePost());
      syncPostTagsMock.mockRejectedValueOnce(new Error("One or more tag IDs are invalid"));

      await expect(updateDraft(postId, { tagIds: [tagId] }, userId)).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    it("throws NotFoundError when update returns nothing", async () => {
      findPostByIdMock.mockResolvedValue(makePost());
      updatePostByIdMock.mockResolvedValueOnce(undefined);

      await expect(updateDraft(postId, { title: "Updated" }, userId)).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe("slug lookups", () => {
    it("gets posts by slug and published slug", async () => {
      findPostBySlugMock.mockResolvedValue(makePost());
      findPublishedPostBySlugMock.mockResolvedValue(makePost({ status: "published" }));

      await expect(getBySlug("hello-world")).resolves.toMatchObject({ slug: "hello-world" });
      await expect(getPublishedBySlug("hello-world")).resolves.toMatchObject({
        status: "published",
      });
    });

    it("throws when slug lookups miss", async () => {
      findPostBySlugMock.mockResolvedValue(undefined);
      findPublishedPostBySlugMock.mockResolvedValue(undefined);

      await expect(getBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
      await expect(getPublishedBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
