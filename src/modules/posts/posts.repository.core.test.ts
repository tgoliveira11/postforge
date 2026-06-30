import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertMock,
  updateMock,
  selectMock,
  fromMock,
  whereMock,
  limitMock,
  setMock,
  valuesMock,
  returningMock,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  const setMock = vi.fn();
  const valuesMock = vi.fn();
  const limitMock = vi.fn();
  const whereMock = vi.fn();
  const fromMock = vi.fn();
  const selectMock = vi.fn();
  const updateMock = vi.fn();
  const insertMock = vi.fn();

  return {
    insertMock,
    updateMock,
    selectMock,
    fromMock,
    whereMock,
    limitMock,
    setMock,
    valuesMock,
    returningMock,
  };
});

vi.mock("@/db/get-db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
    select: selectMock,
  },
}));

import {
  findPostById,
  findPublishedPostBySlug,
  insertPost,
  publishedPostFilter,
  slugExists,
  updatePostById,
} from "@/modules/posts/posts.repository";

const samplePost = {
  id: "post-1",
  title: "Sample",
  slug: "sample",
  excerpt: null,
  contentMarkdown: "Body",
  contentHtmlCache: null,
  coverAssetId: null,
  ogAssetId: null,
  status: "draft" as const,
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
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("posts repository core queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    returningMock.mockResolvedValue([samplePost]);
    setMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ returning: returningMock, limit: limitMock });
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });
    updateMock.mockReturnValue({ set: setMock });

    limitMock.mockResolvedValue([samplePost]);
    fromMock.mockReturnValue({ where: whereMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("insertPost returns the inserted row", async () => {
    const result = await insertPost({
      title: "Sample",
      slug: "sample",
      contentMarkdown: "Body",
      status: "draft",
      publicOrder: 0,
      createdBy: "user-1",
      updatedBy: "user-1",
    });

    expect(insertMock).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalled();
    expect(result).toEqual(samplePost);
  });

  it("updatePostById returns the updated row", async () => {
    const result = await updatePostById("post-1", { title: "Updated" });

    expect(updateMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Updated" }));
    expect(result).toEqual(samplePost);
  });

  it("findPostById returns a single post", async () => {
    const result = await findPostById("post-1");

    expect(selectMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(result).toEqual(samplePost);
  });

  it("findPostById returns undefined when no row is found", async () => {
    limitMock.mockResolvedValueOnce([]);

    await expect(findPostById("missing")).resolves.toBeUndefined();
  });

  it("slugExists returns true when a matching slug row exists", async () => {
    limitMock.mockResolvedValueOnce([{ id: "post-1" }]);

    await expect(slugExists("sample")).resolves.toBe(true);
  });

  it("slugExists returns false when no slug row exists", async () => {
    limitMock.mockResolvedValueOnce([]);

    await expect(slugExists("missing")).resolves.toBe(false);
  });

  it("slugExists excludes the provided post id", async () => {
    limitMock.mockResolvedValueOnce([]);

    await slugExists("sample", "post-1");

    expect(whereMock).toHaveBeenCalled();
  });

  it("publishedPostFilter is used by findPublishedPostBySlug", async () => {
    const now = new Date("2026-06-14T12:00:00.000Z");
    limitMock.mockResolvedValueOnce([{ ...samplePost, status: "published", publishedAt: now }]);

    const result = await findPublishedPostBySlug("sample", now);

    expect(publishedPostFilter(now)).toBeDefined();
    expect(whereMock).toHaveBeenCalled();
    expect(result?.slug).toBe("sample");
  });
});
