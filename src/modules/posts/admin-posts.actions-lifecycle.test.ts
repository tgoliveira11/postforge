import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  getByIdMock: vi.fn(),
  unpublishPostMock: vi.fn(),
  schedulePostMock: vi.fn(),
  archivePostMock: vi.fn(),
  duplicatePostMock: vi.fn(),
  markFeaturedMock: vi.fn(),
  unmarkFeaturedMock: vi.fn(),
  pinPostMock: vi.fn(),
  unpinPostMock: vi.fn(),
  setPostPublicOrderMock: vi.fn(),
  clearPostPublicOrderMock: vi.fn(),
  movePostPublicOrderMock: vi.fn(),
  renderMarkdownToHtmlMock: vi.fn(),
}));

vi.mock("@/modules/admin/authorization", () => ({
  requireAdminSession: serviceMocks.requireAdminSessionMock,
}));

vi.mock("@/modules/posts/posts.service", () => ({
  getById: serviceMocks.getByIdMock,
  unpublishPost: serviceMocks.unpublishPostMock,
  schedulePost: serviceMocks.schedulePostMock,
  archivePost: serviceMocks.archivePostMock,
  duplicatePost: serviceMocks.duplicatePostMock,
  markFeatured: serviceMocks.markFeaturedMock,
  unmarkFeatured: serviceMocks.unmarkFeaturedMock,
  pinPost: serviceMocks.pinPostMock,
  unpinPost: serviceMocks.unpinPostMock,
  setPostPublicOrder: serviceMocks.setPostPublicOrderMock,
  clearPostPublicOrder: serviceMocks.clearPostPublicOrderMock,
  movePostPublicOrder: serviceMocks.movePostPublicOrderMock,
}));

vi.mock("@/modules/markdown/markdown-renderer", () => ({
  renderMarkdownToHtml: serviceMocks.renderMarkdownToHtmlMock,
}));

vi.mock("@/modules/admin/revalidate-public", () => ({
  revalidatePublicPaths: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import {
  archivePostAction,
  clearPostPublicOrderAction,
  duplicatePostAction,
  markFeaturedAction,
  movePostPublicOrderAction,
  pinPostAction,
  previewMarkdownAction,
  publishPostAction,
  schedulePostAction,
  unpublishPostAction,
  updatePostPublicOrderAction,
} from "@/modules/posts/admin-posts.actions";

const postId = "post-123";
const userId = "admin-user";

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: postId,
    slug: "hello-world",
    status: "published",
    ...overrides,
  };
}

describe("admin post lifecycle actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.requireAdminSessionMock.mockResolvedValue({ user: { id: userId } });
    serviceMocks.getByIdMock.mockResolvedValue(makePost());
    serviceMocks.unpublishPostMock.mockResolvedValue(makePost({ status: "unpublished" }));
    serviceMocks.schedulePostMock.mockResolvedValue(makePost({ status: "scheduled" }));
    serviceMocks.archivePostMock.mockResolvedValue(makePost({ status: "archived" }));
    serviceMocks.duplicatePostMock.mockResolvedValue(makePost({ id: "copy-1" }));
    serviceMocks.markFeaturedMock.mockResolvedValue(makePost({ featured: true }));
    serviceMocks.unmarkFeaturedMock.mockResolvedValue(makePost({ featured: false }));
    serviceMocks.pinPostMock.mockResolvedValue(makePost({ pinned: true }));
    serviceMocks.unpinPostMock.mockResolvedValue(makePost({ pinned: false }));
    serviceMocks.setPostPublicOrderMock.mockResolvedValue(makePost({ publicOrder: 2 }));
    serviceMocks.clearPostPublicOrderMock.mockResolvedValue(makePost({ publicOrder: 0 }));
    serviceMocks.movePostPublicOrderMock.mockResolvedValue(makePost({ publicOrder: 1 }));
    serviceMocks.renderMarkdownToHtmlMock.mockResolvedValue("<p>html</p>");
  });

  it("unpublishPostAction unpublishes a post", async () => {
    const result = await unpublishPostAction(postId);

    expect(result).toEqual({ ok: true, message: "Post unpublished" });
    expect(serviceMocks.unpublishPostMock).toHaveBeenCalledWith(postId, userId);
  });

  it("schedulePostAction schedules a post", async () => {
    const formData = new FormData();
    formData.set("scheduledAt", new Date(Date.now() + 86_400_000).toISOString());

    const result = await schedulePostAction(postId, { ok: true }, formData);

    expect(result).toEqual({ ok: true, message: "Post scheduled" });
    expect(serviceMocks.schedulePostMock).toHaveBeenCalled();
  });

  it("archivePostAction archives a post", async () => {
    const result = await archivePostAction(postId);

    expect(result).toEqual({ ok: true, message: "Post archived" });
  });

  it("duplicatePostAction duplicates a post", async () => {
    await duplicatePostAction(postId);

    expect(serviceMocks.duplicatePostMock).toHaveBeenCalledWith(postId, userId);
  });

  it("markFeaturedAction marks and unmarks featured posts", async () => {
    await expect(markFeaturedAction(postId, true)).resolves.toEqual({
      ok: true,
      message: "Marked featured",
    });
    await expect(markFeaturedAction(postId, false)).resolves.toEqual({
      ok: true,
      message: "Unmarked featured",
    });
  });

  it("pinPostAction pins and unpins posts", async () => {
    const pinForm = new FormData();
    pinForm.set("pinned", "true");
    pinForm.set("pinnedPriority", "3");

    await expect(pinPostAction(postId, { ok: true }, pinForm)).resolves.toEqual({
      ok: true,
      message: "Post pinned",
    });

    const unpinForm = new FormData();
    unpinForm.set("pinned", "false");

    await expect(pinPostAction(postId, { ok: true }, unpinForm)).resolves.toEqual({
      ok: true,
      message: "Post unpinned",
    });
  });

  it("previewMarkdownAction renders markdown for admins", async () => {
    await expect(previewMarkdownAction("# Hello")).resolves.toEqual({ html: "<p>html</p>" });
  });

  it("updatePostPublicOrderAction sets public order", async () => {
    const formData = new FormData();
    formData.set("publicOrder", "2");

    await expect(updatePostPublicOrderAction(postId, { ok: true }, formData)).resolves.toEqual({
      ok: true,
      message: "Public order set to 2",
    });
  });

  it("clearPostPublicOrderAction clears public order", async () => {
    await expect(clearPostPublicOrderAction(postId)).resolves.toEqual({
      ok: true,
      message: "Public order cleared",
    });
  });

  it("movePostPublicOrderAction moves posts up and down", async () => {
    await expect(movePostPublicOrderAction(postId, "up")).resolves.toEqual({
      ok: true,
      message: "Moved up in public order",
    });
    await expect(movePostPublicOrderAction(postId, "down")).resolves.toEqual({
      ok: true,
      message: "Moved down in public order",
    });
  });

  it("returns errors when lifecycle actions fail", async () => {
    serviceMocks.archivePostMock.mockRejectedValueOnce(new Error("Not found"));

    const result = await archivePostAction(postId);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not found");
  });

  it("returns early when post id is missing", async () => {
    await expect(publishPostAction("")).resolves.toEqual({
      ok: false,
      error: "Post ID is required",
    });
  });
});
