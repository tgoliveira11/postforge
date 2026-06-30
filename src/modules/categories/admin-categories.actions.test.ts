import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  createCategoryMock,
  updateCategoryMock,
  deleteCategoryMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  createCategoryMock: vi.fn(),
  updateCategoryMock: vi.fn(),
  deleteCategoryMock: vi.fn(),
}));

vi.mock("@/modules/admin/authorization", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/modules/categories/categories.service", () => ({
  createCategory: createCategoryMock,
  updateCategory: updateCategoryMock,
  deleteCategory: deleteCategoryMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/modules/categories/admin-categories.actions";

describe("admin categories actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    createCategoryMock.mockResolvedValue(undefined);
    updateCategoryMock.mockResolvedValue(undefined);
    deleteCategoryMock.mockResolvedValue(undefined);
  });

  it("createCategoryAction creates a category", async () => {
    const formData = new FormData();
    formData.set("name", "Engineering");
    formData.set("slug", "engineering");
    formData.set("description", "Tech posts");

    const result = await createCategoryAction({ ok: true }, formData);

    expect(result).toEqual({ ok: true, message: "Category created" });
    expect(createCategoryMock).toHaveBeenCalledWith({
      name: "Engineering",
      slug: "engineering",
      description: "Tech posts",
    });
  });

  it("updateCategoryAction updates a category", async () => {
    const formData = new FormData();
    formData.set("name", "Dev");
    formData.set("description", "Updated");

    const result = await updateCategoryAction("cat-1", { ok: true }, formData);

    expect(result).toEqual({ ok: true, message: "Category updated" });
    expect(updateCategoryMock).toHaveBeenCalledWith("cat-1", {
      name: "Dev",
      description: "Updated",
    });
  });

  it("deleteCategoryAction deletes a category", async () => {
    const result = await deleteCategoryAction("cat-1");

    expect(result).toEqual({ ok: true, message: "Category deleted" });
    expect(deleteCategoryMock).toHaveBeenCalledWith("cat-1");
  });

  it("returns validation errors from the service", async () => {
    createCategoryMock.mockRejectedValueOnce(new Error("Invalid slug"));

    const formData = new FormData();
    formData.set("name", "Engineering");
    formData.set("slug", "bad slug");

    const result = await createCategoryAction({ ok: true }, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/slug/i);
  });

  it("maps auth failures and unknown errors", async () => {
    requireAdminSessionMock.mockRejectedValueOnce(new Error("Forbidden"));

    await expect(deleteCategoryAction("cat-1")).resolves.toEqual({
      ok: false,
      error: "Forbidden",
    });

    deleteCategoryMock.mockRejectedValueOnce("boom");
    await expect(deleteCategoryAction("cat-1")).resolves.toEqual({
      ok: false,
      error: "Something went wrong",
    });
  });

  it("createCategoryAction omits optional slug and description", async () => {
    const formData = new FormData();
    formData.set("name", "Engineering");

    await createCategoryAction({ ok: true }, formData);

    expect(createCategoryMock).toHaveBeenCalledWith({
      name: "Engineering",
      slug: undefined,
      description: undefined,
    });
  });

  it("updateCategoryAction preserves empty description when field is present", async () => {
    const formData = new FormData();
    formData.set("name", "Dev");
    formData.set("description", "");

    await updateCategoryAction("cat-1", { ok: true }, formData);

    expect(updateCategoryMock).toHaveBeenCalledWith("cat-1", {
      name: "Dev",
      slug: undefined,
      description: "",
    });
  });

  it("maps AppError messages from the service", async () => {
    const { AppError } = await import("@/lib/errors");
    createCategoryMock.mockRejectedValueOnce(new AppError("Category exists", "CONFLICT", 409));

    const formData = new FormData();
    formData.set("name", "Engineering");

    const result = await createCategoryAction({ ok: true }, formData);

    expect(result).toEqual({ ok: false, error: "Category exists" });
  });
});
