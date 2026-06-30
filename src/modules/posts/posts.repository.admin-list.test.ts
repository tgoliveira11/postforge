import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectMock,
  selectDistinctMock,
  fromMock,
  innerJoinMock,
  leftJoinMock,
  whereMock,
  orderByMock,
  limitMock,
  offsetMock,
} = vi.hoisted(() => {
  const offsetMock = vi.fn();
  const limitMock = vi.fn();
  const orderByMock = vi.fn();
  const whereMock = vi.fn();
  const leftJoinMock = vi.fn();
  const innerJoinMock = vi.fn();
  const fromMock = vi.fn();
  const selectDistinctMock = vi.fn();
  const selectMock = vi.fn();

  return {
    selectMock,
    selectDistinctMock,
    fromMock,
    innerJoinMock,
    leftJoinMock,
    whereMock,
    orderByMock,
    limitMock,
    offsetMock,
  };
});

vi.mock("@/db/get-db", () => ({
  db: {
    select: selectMock,
    selectDistinct: selectDistinctMock,
  },
}));

import {
  countAdminPosts,
  getMaxPublicOrder,
  getNextPublicOrder,
  listAdminPosts,
  listAdminPostsWithTotal,
} from "@/modules/posts/posts.repository";

function mockMaxPublicOrder(max: number | null) {
  const whereForMax = vi.fn().mockResolvedValue([{ max }]);
  const fromForMax = vi.fn().mockReturnValue({ where: whereForMax });
  selectMock.mockReturnValueOnce({ from: fromForMax });
}

function mockPlainListResult(rows: unknown[]) {
  offsetMock.mockResolvedValueOnce(rows);
}

function mockTagFilterQueries(post: { id: string; title: string }) {
  whereMock
    .mockResolvedValueOnce([{ id: post.id }])
    .mockResolvedValueOnce([{ count: 1 }])
    .mockReturnValueOnce({ orderBy: orderByMock });

  mockPlainListResult([post]);
}

describe("posts repository admin helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    offsetMock.mockResolvedValue([]);
    limitMock.mockReturnValue({ offset: offsetMock });
    orderByMock.mockReturnValue({ limit: limitMock });
    whereMock.mockReturnValue({ orderBy: orderByMock });
    leftJoinMock.mockReturnValue({ where: whereMock });
    innerJoinMock.mockReturnValue({ where: whereMock });
    fromMock.mockReturnValue({
      where: whereMock,
      innerJoin: innerJoinMock,
      leftJoin: leftJoinMock,
    });
    selectMock.mockReturnValue({ from: fromMock });
    selectDistinctMock.mockReturnValue({ from: fromMock });
  });

  it("getMaxPublicOrder returns null when no posts have publicOrder", async () => {
    mockMaxPublicOrder(null);
    await expect(getMaxPublicOrder()).resolves.toBeNull();
  });

  it("getNextPublicOrder returns 1 when max publicOrder is null", async () => {
    mockMaxPublicOrder(null);
    await expect(getNextPublicOrder()).resolves.toBe(1);
  });

  it("getNextPublicOrder increments the current max publicOrder", async () => {
    mockMaxPublicOrder(5);
    await expect(getNextPublicOrder()).resolves.toBe(6);
  });

  it("listAdminPosts uses distinct post ids and a second query when tagId filter is provided", async () => {
    const post = { id: "post-1", title: "Tagged post" };
    mockTagFilterQueries(post);

    const rows = await listAdminPosts({ tagId: "tag-1", status: "published" });

    expect(selectDistinctMock).toHaveBeenCalled();
    expect(innerJoinMock).toHaveBeenCalled();
    expect(rows).toEqual([post]);
  });

  it("listAdminPostsWithTotal returns filtered total for tag queries", async () => {
    const post = { id: "post-1", title: "Tagged post" };
    mockTagFilterQueries(post);

    const result = await listAdminPostsWithTotal({ tagId: "tag-1", status: "published" });

    expect(result).toEqual({ posts: [post], totalItems: 1 });
  });

  it("countAdminPosts counts distinct posts for tag filters", async () => {
    whereMock.mockResolvedValueOnce([{ count: 3 }]);

    await expect(countAdminPosts({ tagId: "tag-1" })).resolves.toBe(3);
    expect(innerJoinMock).toHaveBeenCalled();
  });

  it("listAdminPosts uses a plain select when tagId is omitted", async () => {
    whereMock.mockReturnValueOnce({ orderBy: orderByMock });
    whereMock.mockResolvedValueOnce([{ count: 1 }]);
    mockPlainListResult([{ id: "post-1" }]);

    await listAdminPosts({ status: "draft" });

    expect(selectMock).toHaveBeenCalled();
    expect(selectDistinctMock).not.toHaveBeenCalled();
  });

  it("listAdminPostsWithTotal joins categories when sorting by category", async () => {
    whereMock.mockReturnValueOnce({ orderBy: orderByMock });
    whereMock.mockResolvedValueOnce([{ count: 1 }]);
    offsetMock.mockResolvedValueOnce([{ post: { id: "post-1", title: "Post" } }]);

    const result = await listAdminPostsWithTotal({ sort: "category", direction: "asc" });

    expect(leftJoinMock).toHaveBeenCalled();
    expect(result.posts).toEqual([{ id: "post-1", title: "Post" }]);
  });

  it("countAdminPosts without tag filter uses plain count query", async () => {
    whereMock.mockResolvedValueOnce([{ count: 5 }]);

    await expect(countAdminPosts({ status: "published" })).resolves.toBe(5);
    expect(innerJoinMock).not.toHaveBeenCalled();
  });

  it("listAdminPostsWithTotal returns empty posts when tag filter matches nothing", async () => {
    whereMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }]);

    const result = await listAdminPostsWithTotal({ tagId: "tag-1", status: "published" });

    expect(result).toEqual({ posts: [], totalItems: 0 });
  });
});
