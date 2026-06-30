import { beforeEach, describe, expect, it, vi } from "vitest";

function createChain(result: unknown, terminal: "limit" | "orderBy" | "where" | "groupBy" = "limit") {
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
const updateMock = vi.hoisted(() => vi.fn());
const setMock = vi.hoisted(() => vi.fn());
const returningMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/get-db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

import {
  findCategoryByNameCaseInsensitive,
  listAdminCategories,
  searchCategoriesByName,
  updateCategoryById,
} from "@/modules/categories/categories.repository";

const sampleCategory = {
  id: "cat-1",
  name: "Engineering",
  slug: "engineering",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("categories repository extended", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returningMock.mockResolvedValue([sampleCategory]);
    setMock.mockReturnValue({ where: vi.fn(() => ({ returning: returningMock })) });
    updateMock.mockReturnValue({ set: setMock });
  });

  it("updateCategoryById returns updated row", async () => {
    await expect(updateCategoryById("cat-1", { name: "Dev" })).resolves.toEqual(sampleCategory);
  });

  it("findCategoryByNameCaseInsensitive returns a category", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([sampleCategory], "limit")),
    });

    await expect(findCategoryByNameCaseInsensitive("Engineering")).resolves.toEqual(sampleCategory);
  });

  it("searchCategoriesByName returns empty for blank query", async () => {
    await expect(searchCategoriesByName("   ")).resolves.toEqual([]);
  });

  it("searchCategoriesByName returns matches", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([sampleCategory], "limit")),
    });

    await expect(searchCategoriesByName("eng")).resolves.toEqual([sampleCategory]);
  });

  it("listAdminCategories maps numeric counts", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() =>
        createChain([{ ...sampleCategory, totalPostCount: "3", publishedPostCount: "2" }], "orderBy")
      ),
    });

    const rows = await listAdminCategories();

    expect(rows[0]?.totalPostCount).toBe(3);
    expect(rows[0]?.publishedPostCount).toBe(2);
  });
});
