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

const selectMock = vi.hoisted(() => vi.fn());
const selectDistinctMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/get-db", () => ({
  db: {
    select: selectMock,
    selectDistinct: selectDistinctMock,
  },
}));

import {
  countAdminPosts,
  countAllPosts,
  listAdminPostsWithTotal,
  listPublishedPosts,
  slugExists,
} from "@/modules/posts/posts.repository";

describe("posts repository filter branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("slugExists supports excluding the current post id", async () => {
    selectMock.mockReturnValueOnce(createChain([{ id: "other-post" }], "limit"));

    await expect(slugExists("hello-world", "post-1")).resolves.toBe(true);
    expect(selectMock).toHaveBeenCalled();
  });

  it("countAdminPosts applies featured and pinned filters", async () => {
    selectMock.mockReturnValueOnce(createChain([{ count: 2 }], "where"));

    await expect(
      countAdminPosts({ featured: true, pinned: false, search: "hello" })
    ).resolves.toBe(2);
  });

  it("listAdminPostsWithTotal uses category join for tag filters with category sort", async () => {
    const offsetMock = vi.fn().mockResolvedValue([{ post: { id: "post-1", title: "Tagged" } }]);
    const limitMock = vi.fn().mockReturnValue({ offset: offsetMock });
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "post-1" }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockReturnValueOnce({ orderBy: orderByMock });
    const leftJoinMock = vi.fn().mockReturnValue({ where: whereMock });
    const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
    const fromMock = vi.fn().mockReturnValue({
      innerJoin: innerJoinMock,
      leftJoin: leftJoinMock,
      where: whereMock,
    });

    selectDistinctMock.mockReturnValue({ from: fromMock });
    selectMock.mockReturnValue({ from: fromMock });

    const result = await listAdminPostsWithTotal({
      tagId: "tag-1",
      sort: "category",
      direction: "asc",
      featured: true,
      pinned: true,
    });

    expect(leftJoinMock).toHaveBeenCalled();
    expect(result.posts).toEqual([{ id: "post-1", title: "Tagged" }]);
  });

  it("countAllPosts returns zero when count row is missing", async () => {
    selectMock.mockReturnValueOnce(createChain([], "from"));

    await expect(countAllPosts()).resolves.toBe(0);
  });

  it("listPublishedPosts uses default limit and offset", async () => {
    const offsetMock = vi.fn().mockResolvedValue([{ id: "post-1" }]);
    const limitMock = vi.fn().mockReturnValue({ offset: offsetMock });
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    selectMock.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: whereMock }) });

    const posts = await listPublishedPosts();

    expect(posts).toEqual([{ id: "post-1" }]);
    expect(limitMock).toHaveBeenCalled();
    expect(offsetMock).toHaveBeenCalled();
  });
});
