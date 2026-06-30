import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMock,
  insertMock,
  selectMock,
  updateMock,
  fromMock,
  whereMock,
  limitMock,
  orderByMock,
  valuesMock,
  setMock,
  returningMock,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  const setMock = vi.fn();
  const valuesMock = vi.fn();
  const orderByMock = vi.fn();
  const limitMock = vi.fn();
  const whereMock = vi.fn();
  const fromMock = vi.fn();
  const selectMock = vi.fn();
  const updateMock = vi.fn();
  const insertMock = vi.fn();
  const deleteMock = vi.fn();

  return {
    deleteMock,
    insertMock,
    selectMock,
    updateMock,
    fromMock,
    whereMock,
    limitMock,
    orderByMock,
    valuesMock,
    setMock,
    returningMock,
  };
});

vi.mock("@/db/get-db", () => ({
  db: {
    delete: deleteMock,
    insert: insertMock,
    select: selectMock,
    update: updateMock,
  },
}));

import {
  deleteTagById,
  findTagById,
  findTagBySlug,
  insertTag,
  listTags,
  countTagUsage,
} from "@/modules/tags/tags.repository";

const sampleTag = {
  id: "tag-1",
  name: "News",
  slug: "news",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("tags repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    returningMock.mockResolvedValue([sampleTag]);
    setMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ returning: returningMock, limit: limitMock });
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });
    updateMock.mockReturnValue({ set: setMock });
    deleteMock.mockReturnValue({ where: whereMock });

    limitMock.mockResolvedValue([sampleTag]);
    orderByMock.mockResolvedValue([sampleTag]);
    fromMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("insertTag returns the inserted row", async () => {
    const result = await insertTag({ name: "News", slug: "news" });

    expect(insertMock).toHaveBeenCalled();
    expect(result).toEqual(sampleTag);
  });

  it("findTagById returns a tag", async () => {
    const result = await findTagById("tag-1");

    expect(selectMock).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(result).toEqual(sampleTag);
  });

  it("findTagBySlug returns undefined when missing", async () => {
    limitMock.mockResolvedValueOnce([]);

    await expect(findTagBySlug("missing")).resolves.toBeUndefined();
  });

  it("listTags orders tags by name", async () => {
    const rows = await listTags();

    expect(fromMock).toHaveBeenCalled();
    expect(orderByMock).toHaveBeenCalled();
    expect(rows).toEqual([sampleTag]);
  });

  it("countTagUsage returns a numeric count", async () => {
    whereMock.mockResolvedValueOnce([{ count: 3 }]);

    await expect(countTagUsage("tag-1")).resolves.toBe(3);
  });

  it("deleteTagById returns true when a row is deleted", async () => {
    returningMock.mockResolvedValueOnce([{ id: "tag-1" }]);

    await expect(deleteTagById("tag-1")).resolves.toBe(true);
  });

  it("deleteTagById returns false when nothing is deleted", async () => {
    returningMock.mockResolvedValueOnce([]);

    await expect(deleteTagById("missing")).resolves.toBe(false);
  });
});
