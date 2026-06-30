import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  getByIdMock: vi.fn(),
  updateDraftMock: vi.fn(),
  publishPostMock: vi.fn(),
  unpublishPostMock: vi.fn(),
  markFeaturedMock: vi.fn(),
  unmarkFeaturedMock: vi.fn(),
  pinPostMock: vi.fn(),
  unpinPostMock: vi.fn(),
  setPostPublicOrderMock: vi.fn(),
  clearPostPublicOrderMock: vi.fn(),
  movePostPublicOrderMock: vi.fn(),
  revalidatePublicPathsMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/modules/admin/authorization", () => ({
  requireAdminSession: mocks.requireAdminSessionMock,
}));

vi.mock("@/modules/posts/posts.service", () => ({
  getById: mocks.getByIdMock,
  updateDraft: mocks.updateDraftMock,
  publishPost: mocks.publishPostMock,
  unpublishPost: mocks.unpublishPostMock,
  markFeatured: mocks.markFeaturedMock,
  unmarkFeatured: mocks.unmarkFeaturedMock,
  pinPost: mocks.pinPostMock,
  unpinPost: mocks.unpinPostMock,
  setPostPublicOrder: mocks.setPostPublicOrderMock,
  clearPostPublicOrder: mocks.clearPostPublicOrderMock,
  movePostPublicOrder: mocks.movePostPublicOrderMock,
}));

vi.mock("@/modules/admin/revalidate-public", () => ({
  revalidatePublicPaths: mocks.revalidatePublicPathsMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePathMock,
}));

vi.mock("@/modules/markdown/markdown-renderer", () => ({
  renderMarkdownToHtml: vi.fn().mockResolvedValue("<p>html</p>"),
}));

import {
  autosavePostAction,
  clearPostPublicOrderAction,
  markFeaturedAction,
  movePostPublicOrderAction,
  pinPostAction,
  publishPostAction,
  updatePostAction,
  updatePostPublicOrderAction,
} from "@/modules/posts/admin-posts.actions";

const postId = "post-123";
const userId = "admin-user";

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: postId,
    slug: "old-slug",
    status: "draft",
    ...overrides,
  };
}

function editorForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("title", "Title");
  formData.set("slug", "new-slug");
  formData.set("contentMarkdown", "Body");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("admin post action revalidation branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminSessionMock.mockResolvedValue({ user: { id: userId } });
    mocks.getByIdMock.mockResolvedValue(makePost());
    mocks.updateDraftMock.mockResolvedValue(makePost());
    mocks.publishPostMock.mockResolvedValue(makePost({ status: "published", slug: "new-slug" }));
    mocks.markFeaturedMock.mockResolvedValue(makePost({ featured: true }));
    mocks.unmarkFeaturedMock.mockResolvedValue(makePost({ featured: false }));
    mocks.pinPostMock.mockResolvedValue(makePost({ pinned: true }));
    mocks.unpinPostMock.mockResolvedValue(makePost({ pinned: false }));
    mocks.setPostPublicOrderMock.mockResolvedValue(makePost({ publicOrder: 2 }));
    mocks.clearPostPublicOrderMock.mockResolvedValue(makePost({ publicOrder: 0 }));
    mocks.movePostPublicOrderMock.mockResolvedValue(makePost({ publicOrder: 1 }));
  });

  it("autosavePostAction rejects missing post id", async () => {
    const result = await autosavePostAction("", editorForm());

    expect(result).toEqual({ ok: false, error: "Post ID is required" });
    expect(mocks.updateDraftMock).not.toHaveBeenCalled();
  });

  it("autosavePostAction revalidates published posts and slug changes", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "old-slug" }));
    mocks.updateDraftMock.mockResolvedValue(makePost({ status: "published", slug: "new-slug" }));

    const result = await autosavePostAction(postId, editorForm());

    expect(result.ok).toBe(true);
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("old-slug");
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("new-slug");
  });

  it("updatePostAction revalidates both slugs when publishing with slug change", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ slug: "old-slug" }));
    mocks.publishPostMock.mockResolvedValue(makePost({ status: "published", slug: "new-slug" }));

    const result = await updatePostAction(postId, { ok: true }, editorForm({ intent: "publish" }));

    expect(result.ok).toBe(true);
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("old-slug");
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("new-slug");
  });

  it("updatePostAction revalidates published saves when slug changes", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "old-slug" }));
    mocks.updateDraftMock.mockResolvedValue(makePost({ status: "published", slug: "new-slug" }));

    const result = await updatePostAction(postId, { ok: true }, editorForm({ intent: "save" }));

    expect(result.ok).toBe(true);
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("old-slug");
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("new-slug");
  });

  it("publishPostAction revalidates both slugs when slug changes", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ slug: "old-slug" }));
    mocks.publishPostMock.mockResolvedValue(makePost({ status: "published", slug: "new-slug" }));

    const result = await publishPostAction(postId);

    expect(result.ok).toBe(true);
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("old-slug");
    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("new-slug");
  });

  it("markFeaturedAction revalidates published posts", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "live-post" }));

    await markFeaturedAction(postId, true);

    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("live-post");
  });

  it("pinPostAction revalidates published posts", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "live-post" }));
    const formData = new FormData();
    formData.set("pinned", "true");
    formData.set("pinnedPriority", "1");

    await pinPostAction(postId, { ok: true }, formData);

    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("live-post");
  });

  it("updatePostPublicOrderAction revalidates published posts", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "live-post" }));
    const formData = new FormData();
    formData.set("publicOrder", "3");

    await updatePostPublicOrderAction(postId, { ok: true }, formData);

    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("live-post");
  });

  it("clearPostPublicOrderAction revalidates published posts", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "live-post" }));

    await clearPostPublicOrderAction(postId);

    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("live-post");
  });

  it("movePostPublicOrderAction revalidates published posts", async () => {
    mocks.getByIdMock.mockResolvedValue(makePost({ status: "published", slug: "live-post" }));

    await movePostPublicOrderAction(postId, "up");

    expect(mocks.revalidatePublicPathsMock).toHaveBeenCalledWith("live-post");
  });
});
