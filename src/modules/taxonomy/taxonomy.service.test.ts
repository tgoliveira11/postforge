import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictError } from "@/lib/errors";
import {
  isValidTaxonomyName,
  normalizeTaxonomyName,
  taxonomyNamesMatch,
} from "@/modules/taxonomy/taxonomy-name";
import * as taxonomyService from "@/modules/taxonomy/taxonomy.service";

vi.mock("@/modules/tags/tags.repository", () => ({
  findTagBySlug: vi.fn(),
  findTagByNameCaseInsensitive: vi.fn(),
  searchTagsByName: vi.fn(),
}));

vi.mock("@/modules/tags/tags.service", () => ({
  createTag: vi.fn(),
}));

vi.mock("@/modules/categories/categories.repository", () => ({
  findCategoryBySlug: vi.fn(),
  findCategoryByNameCaseInsensitive: vi.fn(),
  searchCategoriesByName: vi.fn(),
}));

vi.mock("@/modules/categories/categories.service", () => ({
  createCategory: vi.fn(),
}));

import * as tagsRepo from "@/modules/tags/tags.repository";
import * as tagsService from "@/modules/tags/tags.service";
import * as categoriesRepo from "@/modules/categories/categories.repository";
import * as categoriesService from "@/modules/categories/categories.service";

const sampleTag = {
  id: "tag-1",
  name: "Next.js",
  slug: "nextjs",
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

describe("taxonomy name helpers", () => {
  it("normalizes whitespace and repeated spaces", () => {
    expect(normalizeTaxonomyName("  nextjs   architecture  ")).toBe("nextjs architecture");
  });

  it("rejects empty names", () => {
    expect(isValidTaxonomyName("   ")).toBe(false);
  });

  it("matches names case-insensitively", () => {
    expect(taxonomyNamesMatch("NextJS", "nextjs")).toBe(true);
  });
});

describe("taxonomy.service findOrCreate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reuses an existing tag by slug", async () => {
    vi.mocked(tagsRepo.findTagBySlug).mockResolvedValue(sampleTag);

    const result = await taxonomyService.findOrCreateTag("nextjs");

    expect(result.item).toEqual(sampleTag);
    expect(result.created).toBe(false);
    expect(tagsService.createTag).not.toHaveBeenCalled();
  });

  it("reuses an existing tag by case-insensitive name", async () => {
    vi.mocked(tagsRepo.findTagBySlug).mockResolvedValue(undefined);
    vi.mocked(tagsRepo.findTagByNameCaseInsensitive).mockResolvedValue(sampleTag);

    const result = await taxonomyService.findOrCreateTag("Next.js");

    expect(result.item).toEqual(sampleTag);
    expect(result.created).toBe(false);
  });

  it("creates a tag when none exists", async () => {
    vi.mocked(tagsRepo.findTagBySlug).mockResolvedValue(undefined);
    vi.mocked(tagsRepo.findTagByNameCaseInsensitive).mockResolvedValue(undefined);
    vi.mocked(tagsService.createTag).mockResolvedValue(sampleTag);

    const result = await taxonomyService.findOrCreateTag("nextjs");

    expect(tagsService.createTag).toHaveBeenCalledWith({ name: "nextjs" });
    expect(result.created).toBe(true);
  });

  it("reuses tag after create conflict", async () => {
    vi.mocked(tagsRepo.findTagBySlug)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(sampleTag);
    vi.mocked(tagsRepo.findTagByNameCaseInsensitive).mockResolvedValue(undefined);
    vi.mocked(tagsService.createTag).mockRejectedValue(new ConflictError("Tag slug already exists"));

    const result = await taxonomyService.findOrCreateTag("nextjs");

    expect(result.item).toEqual(sampleTag);
    expect(result.created).toBe(false);
  });

  it("reuses category by slug and creates when missing", async () => {
    vi.mocked(categoriesRepo.findCategoryBySlug).mockResolvedValueOnce(sampleCategory);
    let categoryResult = await taxonomyService.findOrCreateCategory("Engineering");
    expect(categoryResult.created).toBe(false);

    vi.mocked(categoriesRepo.findCategoryBySlug).mockResolvedValue(undefined);
    vi.mocked(categoriesRepo.findCategoryByNameCaseInsensitive).mockResolvedValue(undefined);
    vi.mocked(categoriesService.createCategory).mockResolvedValue(sampleCategory);

    categoryResult = await taxonomyService.findOrCreateCategory("Engineering");
    expect(categoriesService.createCategory).toHaveBeenCalledWith({ name: "Engineering" });
    expect(categoryResult.created).toBe(true);
  });

  it("reuses an existing category by case-insensitive name", async () => {
    vi.mocked(categoriesRepo.findCategoryBySlug).mockResolvedValue(undefined);
    vi.mocked(categoriesRepo.findCategoryByNameCaseInsensitive).mockResolvedValue(sampleCategory);

    const result = await taxonomyService.findOrCreateCategory("engineering");

    expect(result.item).toEqual(sampleCategory);
    expect(result.created).toBe(false);
    expect(categoriesService.createCategory).not.toHaveBeenCalled();
  });

  it("reuses category after create conflict", async () => {
    vi.mocked(categoriesRepo.findCategoryBySlug)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(sampleCategory);
    vi.mocked(categoriesRepo.findCategoryByNameCaseInsensitive).mockResolvedValue(undefined);
    vi.mocked(categoriesService.createCategory).mockRejectedValue(
      new ConflictError("Category slug already exists")
    );

    const result = await taxonomyService.findOrCreateCategory("Engineering");

    expect(result.item).toEqual(sampleCategory);
    expect(result.created).toBe(false);
  });

  it("rethrows tag conflicts when fallback lookup misses", async () => {
    vi.mocked(tagsRepo.findTagBySlug).mockResolvedValue(undefined);
    vi.mocked(tagsRepo.findTagByNameCaseInsensitive).mockResolvedValue(undefined);
    vi.mocked(tagsService.createTag).mockRejectedValue(new ConflictError("Tag slug already exists"));

    await expect(taxonomyService.findOrCreateTag("nextjs")).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid taxonomy names", async () => {
    await expect(taxonomyService.findOrCreateTag("")).rejects.toThrow(/name/i);
  });
});

describe("taxonomy.service search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("searchTags returns empty results for blank queries", async () => {
    await expect(taxonomyService.searchTags("   ")).resolves.toEqual([]);
    expect(tagsRepo.searchTagsByName).not.toHaveBeenCalled();
  });

  it("searchTags delegates trimmed queries to the repository", async () => {
    vi.mocked(tagsRepo.searchTagsByName).mockResolvedValue([sampleTag]);

    const results = await taxonomyService.searchTags("  next  ");

    expect(tagsRepo.searchTagsByName).toHaveBeenCalledWith("next");
    expect(results).toEqual([sampleTag]);
  });

  it("searchCategories returns empty results for blank queries", async () => {
    await expect(taxonomyService.searchCategories("")).resolves.toEqual([]);
    expect(categoriesRepo.searchCategoriesByName).not.toHaveBeenCalled();
  });

  it("searchCategories delegates trimmed queries to the repository", async () => {
    vi.mocked(categoriesRepo.searchCategoriesByName).mockResolvedValue([sampleCategory]);

    const results = await taxonomyService.searchCategories("eng");

    expect(categoriesRepo.searchCategoriesByName).toHaveBeenCalledWith("eng");
    expect(results).toEqual([sampleCategory]);
  });
});

describe("taxonomy.service normalizeTaxonomyInput", () => {
  it("normalizes valid input", () => {
    expect(taxonomyService.normalizeTaxonomyInput("  hello   world  ")).toBe("hello world");
  });

  it("rejects names that are too long after normalization", () => {
    expect(() => taxonomyService.normalizeTaxonomyInput("x".repeat(121))).toThrow(/1 and 120/i);
  });
});
