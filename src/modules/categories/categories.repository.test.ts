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
  countCategoryUsage,
  deleteCategoryById,
  findCategoryById,
  findCategoryBySlug,
  insertCategory,
  listCategories,
} from "@/modules/categories/categories.repository";

const sampleCategory = {
  id: "cat-1",
  name: "Engineering",
  slug: "engineering",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("categories repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    returningMock.mockResolvedValue([sampleCategory]);
    setMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ returning: returningMock, limit: limitMock });
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });
    updateMock.mockReturnValue({ set: setMock });
    deleteMock.mockReturnValue({ where: whereMock });

    limitMock.mockResolvedValue([sampleCategory]);
    orderByMock.mockResolvedValue([sampleCategory]);
    fromMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("insertCategory returns the inserted row", async () => {
    const result = await insertCategory({
      name: "Engineering",
      slug: "engineering",
      description: null,
    });

    expect(insertMock).toHaveBeenCalled();
    expect(result).toEqual(sampleCategory);
  });

  it("findCategoryById returns a category", async () => {
    const result = await findCategoryById("cat-1");

    expect(selectMock).toHaveBeenCalled();
    expect(result).toEqual(sampleCategory);
  });

  it("findCategoryBySlug returns undefined when missing", async () => {
    limitMock.mockResolvedValueOnce([]);

    await expect(findCategoryBySlug("missing")).resolves.toBeUndefined();
  });

  it("listCategories orders categories by name", async () => {
    const rows = await listCategories();

    expect(orderByMock).toHaveBeenCalled();
    expect(rows).toEqual([sampleCategory]);
  });

  it("countCategoryUsage returns a numeric count", async () => {
    whereMock.mockResolvedValueOnce([{ count: 2 }]);

    await expect(countCategoryUsage("cat-1")).resolves.toBe(2);
  });

  it("deleteCategoryById returns true when a row is deleted", async () => {
    returningMock.mockResolvedValueOnce([{ id: "cat-1" }]);

    await expect(deleteCategoryById("cat-1")).resolves.toBe(true);
  });

  it("deleteCategoryById returns false when nothing is deleted", async () => {
    returningMock.mockResolvedValueOnce([]);

    await expect(deleteCategoryById("missing")).resolves.toBe(false);
  });
});
