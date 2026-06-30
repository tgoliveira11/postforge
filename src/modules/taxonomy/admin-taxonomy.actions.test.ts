import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  searchTagsMock,
  findOrCreateTagMock,
  searchCategoriesMock,
  findOrCreateCategoryMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  searchTagsMock: vi.fn(),
  findOrCreateTagMock: vi.fn(),
  searchCategoriesMock: vi.fn(),
  findOrCreateCategoryMock: vi.fn(),
}));

vi.mock("@/modules/admin/authorization", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/modules/taxonomy/taxonomy.service", () => ({
  searchTags: searchTagsMock,
  findOrCreateTag: findOrCreateTagMock,
  searchCategories: searchCategoriesMock,
  findOrCreateCategory: findOrCreateCategoryMock,
}));

import {
  createOrFindCategoryAction,
  createOrFindTagAction,
  searchCategoriesAction,
  searchTagsAction,
} from "@/modules/taxonomy/admin-taxonomy.actions";

const sampleTag = {
  id: "tag-1",
  name: "TypeScript",
  slug: "typescript",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleCategory = {
  id: "cat-1",
  name: "Engineering",
  slug: "engineering",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("admin taxonomy actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    searchTagsMock.mockResolvedValue([sampleTag]);
    searchCategoriesMock.mockResolvedValue([sampleCategory]);
    findOrCreateTagMock.mockResolvedValue({ item: sampleTag, created: true });
    findOrCreateCategoryMock.mockResolvedValue({ item: sampleCategory, created: false });
  });

  it("searchTagsAction returns tags", async () => {
    const result = await searchTagsAction("type");

    expect(result).toEqual({ ok: true, data: { tags: [sampleTag] } });
  });

  it("createOrFindTagAction returns created flag", async () => {
    const result = await createOrFindTagAction("TypeScript");

    expect(result).toEqual({ ok: true, data: { tag: sampleTag, created: true } });
  });

  it("searchCategoriesAction returns categories", async () => {
    const result = await searchCategoriesAction("eng");

    expect(result).toEqual({ ok: true, data: { categories: [sampleCategory] } });
  });

  it("createOrFindCategoryAction returns existing category", async () => {
    const result = await createOrFindCategoryAction("Engineering");

    expect(result).toEqual({ ok: true, data: { category: sampleCategory, created: false } });
  });

  it("maps errors to action failures", async () => {
    searchTagsMock.mockRejectedValueOnce(new Error("Forbidden"));

    const result = await searchTagsAction("type");

    expect(result).toEqual({ ok: false, error: "Forbidden" });
  });

  it("maps AppError and unknown failures across actions", async () => {
    const { AppError } = await import("@/lib/errors");

    searchCategoriesMock.mockRejectedValueOnce(new AppError("Denied"));
    await expect(searchCategoriesAction("eng")).resolves.toEqual({
      ok: false,
      error: "Denied",
    });

    findOrCreateTagMock.mockRejectedValueOnce("boom");
    await expect(createOrFindTagAction("TS")).resolves.toEqual({
      ok: false,
      error: "Something went wrong",
    });

    requireAdminSessionMock.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(createOrFindCategoryAction("Engineering")).resolves.toEqual({
      ok: false,
      error: "Forbidden",
    });
  });
});
