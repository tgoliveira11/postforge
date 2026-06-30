import { beforeEach, describe, expect, it, vi } from "vitest";

function createChain(result: unknown, terminal: "limit" | "offset" | "orderBy" | "where" | "groupBy" = "limit") {
  const terminalMock = vi.fn().mockResolvedValue(result);
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => chain;
  for (const method of ["from", "where", "orderBy", "groupBy", "innerJoin", "leftJoin", "limit", "offset"]) {
    chain[method] = vi.fn(self);
  }
  chain[terminal] = terminalMock;
  return chain;
}

const insertMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const valuesMock = vi.hoisted(() => vi.fn());
const returningMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/get-db", () => ({
  db: {
    insert: insertMock,
    select: selectMock,
  },
}));

import {
  countAllPosts,
  countPostsByStatus,
  findCategoryById,
  insertPostRevision,
  listCategoriesByIds,
  listPublishedPosts,
  listPublishedPostsWithPublicOrder,
} from "@/modules/posts/posts.repository";

const sampleRevision = {
  id: "rev-1",
  postId: "post-1",
  title: "Title",
  slug: "title",
  excerpt: null,
  contentMarkdown: "Body",
  metadataSnapshot: null,
  revisionType: "manual_save" as const,
  createdBy: "user-1",
  createdAt: new Date(),
};

describe("posts repository remaining queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returningMock.mockResolvedValue([sampleRevision]);
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });
  });

  it("insertPostRevision returns the inserted revision", async () => {
    const revision = await insertPostRevision({
      postId: "post-1",
      title: "Title",
      slug: "title",
      excerpt: null,
      contentMarkdown: "Body",
      revisionType: "manual_save",
      createdBy: "user-1",
    });

    expect(revision).toEqual(sampleRevision);
  });

  it("countPostsByStatus maps grouped counts", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() =>
        createChain(
          [
            { status: "draft", count: 2 },
            { status: "published", count: 5 },
          ],
          "groupBy"
        )
      ),
    });

    const counts = await countPostsByStatus();

    expect(counts.draft).toBe(2);
    expect(counts.published).toBe(5);
    expect(counts.scheduled).toBe(0);
  });

  it("countAllPosts returns numeric count", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([{ count: 12 }]),
    });

    await expect(countAllPosts()).resolves.toBe(12);
  });

  it("findCategoryById returns a category", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() =>
        createChain([{ id: "cat-1", name: "Engineering", slug: "engineering" }], "limit")
      ),
    });

    await expect(findCategoryById("cat-1")).resolves.toEqual({
      id: "cat-1",
      name: "Engineering",
      slug: "engineering",
    });
  });

  it("listCategoriesByIds returns empty for empty input", async () => {
    await expect(listCategoriesByIds([])).resolves.toEqual([]);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("listCategoriesByIds returns matching categories", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() =>
        createChain([{ id: "cat-1", name: "Engineering", slug: "engineering" }], "where")
      ),
    });

    await expect(listCategoriesByIds(["cat-1", "cat-1"])).resolves.toHaveLength(1);
  });

  it("listPublishedPosts returns published rows", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([{ id: "post-1", slug: "hello" }], "offset")),
    });

    await expect(listPublishedPosts({ limit: 5, offset: 0 })).resolves.toHaveLength(1);
  });

  it("listPublishedPostsWithPublicOrder returns ordered rows", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([{ id: "post-1", publicOrder: 1 }], "orderBy")),
    });

    await expect(listPublishedPostsWithPublicOrder()).resolves.toHaveLength(1);
  });
});
