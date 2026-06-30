import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMock,
  insertMock,
  selectMock,
  fromMock,
  innerJoinMock,
  whereMock,
  valuesMock,
} = vi.hoisted(() => {
  const valuesMock = vi.fn();
  const whereMock = vi.fn();
  const innerJoinMock = vi.fn();
  const fromMock = vi.fn();
  const selectMock = vi.fn();
  const insertMock = vi.fn();
  const deleteMock = vi.fn();

  return { deleteMock, insertMock, selectMock, fromMock, innerJoinMock, whereMock, valuesMock };
});

vi.mock("@/db/get-db", () => ({
  db: {
    delete: deleteMock,
    insert: insertMock,
    select: selectMock,
  },
}));

import {
  getTagIdsForPost,
  getTagsForPost,
  syncPostTags,
} from "@/modules/posts/post-tags.repository";

const sampleTag = {
  id: "tag-1",
  name: "TypeScript",
  slug: "typescript",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("post-tags repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    valuesMock.mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });
    deleteMock.mockReturnValue({ where: whereMock });
    whereMock.mockResolvedValue(undefined);

    innerJoinMock.mockReturnValue({ where: whereMock });
    fromMock.mockReturnValue({ where: whereMock, innerJoin: innerJoinMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("getTagsForPost returns tag rows", async () => {
    whereMock.mockResolvedValueOnce([{ tag: sampleTag }]);

    await expect(getTagsForPost("post-1")).resolves.toEqual([sampleTag]);
  });

  it("getTagIdsForPost returns tag ids", async () => {
    whereMock.mockResolvedValueOnce([{ tagId: "tag-1" }, { tagId: "tag-2" }]);

    await expect(getTagIdsForPost("post-1")).resolves.toEqual(["tag-1", "tag-2"]);
  });

  it("syncPostTags clears tags when empty", async () => {
    await syncPostTags("post-1", []);

    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("syncPostTags validates tag ids before insert", async () => {
    whereMock.mockResolvedValueOnce([{ id: "tag-1" }]);

    await syncPostTags("post-1", ["tag-1", "tag-1"]);

    expect(deleteMock).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith([{ postId: "post-1", tagId: "tag-1" }]);
  });

  it("syncPostTags throws when tag ids are invalid", async () => {
    whereMock.mockResolvedValueOnce([{ id: "tag-1" }]);

    await expect(syncPostTags("post-1", ["tag-1", "missing"])).rejects.toThrow(/invalid/i);
  });
});
