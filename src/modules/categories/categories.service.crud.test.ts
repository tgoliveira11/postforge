import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  countCategoryUsageMock,
  deleteCategoryByIdMock,
  findCategoryByIdMock,
  findCategoryByNameCaseInsensitiveMock,
  findCategoryBySlugMock,
  insertCategoryMock,
  listCategoriesMock,
  updateCategoryByIdMock,
} = vi.hoisted(() => ({
  countCategoryUsageMock: vi.fn(),
  deleteCategoryByIdMock: vi.fn(),
  findCategoryByIdMock: vi.fn(),
  findCategoryByNameCaseInsensitiveMock: vi.fn(),
  findCategoryBySlugMock: vi.fn(),
  insertCategoryMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  updateCategoryByIdMock: vi.fn(),
}));

vi.mock("./categories.repository", () => ({
  countCategoryUsage: countCategoryUsageMock,
  deleteCategoryById: deleteCategoryByIdMock,
  findCategoryById: findCategoryByIdMock,
  findCategoryByNameCaseInsensitive: findCategoryByNameCaseInsensitiveMock,
  findCategoryBySlug: findCategoryBySlugMock,
  insertCategory: insertCategoryMock,
  listCategories: listCategoriesMock,
  listAdminCategories: vi.fn().mockResolvedValue([]),
  updateCategoryById: updateCategoryByIdMock,
}));

import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  createCategory,
  deleteCategory,
  getCategoryBySlug,
  getCategoryUsageCount,
  listAdminCategories,
  listCategories,
  updateCategory,
} from "./categories.service";

const sampleCategory = {
  id: "cat-1",
  name: "Engineering",
  slug: "engineering",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("categories service CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCategoryByNameCaseInsensitiveMock.mockResolvedValue(undefined);
    findCategoryBySlugMock.mockResolvedValue(undefined);
    findCategoryByIdMock.mockResolvedValue(sampleCategory);
    insertCategoryMock.mockResolvedValue(sampleCategory);
    updateCategoryByIdMock.mockResolvedValue({ ...sampleCategory, name: "Product" });
    listCategoriesMock.mockResolvedValue([sampleCategory]);
    countCategoryUsageMock.mockResolvedValue(0);
    deleteCategoryByIdMock.mockResolvedValue(true);
  });

  it("creates a category with a generated slug", async () => {
    const category = await createCategory({ name: "Engineering" });

    expect(insertCategoryMock).toHaveBeenCalledWith({
      name: "Engineering",
      slug: "engineering",
      description: null,
    });
    expect(category).toEqual(sampleCategory);
  });

  it("rejects duplicate category names on create", async () => {
    findCategoryByNameCaseInsensitiveMock.mockResolvedValue(sampleCategory);

    await expect(createCategory({ name: "Engineering" })).rejects.toBeInstanceOf(ConflictError);
    expect(insertCategoryMock).not.toHaveBeenCalled();
  });

  it("updates an existing category", async () => {
    const updated = await updateCategory("cat-1", { name: "Product" });

    expect(updateCategoryByIdMock).toHaveBeenCalledWith("cat-1", {
      name: "Product",
      slug: undefined,
      description: undefined,
    });
    expect(updated.name).toBe("Product");
  });

  it("throws NotFoundError when updating a missing category", async () => {
    findCategoryByIdMock.mockResolvedValue(undefined);

    await expect(updateCategory("missing", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists categories from the repository", async () => {
    await expect(listCategories()).resolves.toEqual([sampleCategory]);
    expect(listCategoriesMock).toHaveBeenCalled();
  });

  it("deletes an unused category", async () => {
    await deleteCategory("cat-1");

    expect(deleteCategoryByIdMock).toHaveBeenCalledWith("cat-1");
  });

  it("throws NotFoundError when deleting a missing category", async () => {
    deleteCategoryByIdMock.mockResolvedValue(false);

    await expect(deleteCategory("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects duplicate slugs on create", async () => {
    findCategoryBySlugMock.mockResolvedValue(sampleCategory);

    await expect(createCategory({ name: "Product", slug: "engineering" })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("rejects invalid slugs on create", async () => {
    await expect(createCategory({ name: "Bad", slug: "---" })).rejects.toThrow(/slug/i);
  });

  it("rejects slug conflicts on update", async () => {
    findCategoryBySlugMock.mockResolvedValue({ ...sampleCategory, id: "other" });

    await expect(updateCategory("cat-1", { slug: "engineering" })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("throws when update returns no row", async () => {
    updateCategoryByIdMock.mockResolvedValue(undefined);

    await expect(updateCategory("cat-1", { name: "Product" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects deleting categories that are in use", async () => {
    countCategoryUsageMock.mockResolvedValue(2);

    await expect(deleteCategory("cat-1")).rejects.toBeInstanceOf(ConflictError);
  });

  it("gets category by slug and usage count", async () => {
    findCategoryBySlugMock.mockResolvedValue(sampleCategory);
    countCategoryUsageMock.mockResolvedValue(3);

    await expect(getCategoryBySlug("engineering")).resolves.toEqual(sampleCategory);
    await expect(getCategoryUsageCount("cat-1")).resolves.toBe(3);
    await expect(listAdminCategories()).resolves.toEqual([]);
  });

  it("throws when category slug is missing", async () => {
    findCategoryBySlugMock.mockResolvedValue(undefined);

    await expect(getCategoryBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
