import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSessionMock, createTagMock, updateTagMock, deleteTagMock } = vi.hoisted(
  () => ({
    requireAdminSessionMock: vi.fn(),
    createTagMock: vi.fn(),
    updateTagMock: vi.fn(),
    deleteTagMock: vi.fn(),
  })
);

vi.mock("@/modules/admin/authorization", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/modules/tags/tags.service", () => ({
  createTag: createTagMock,
  updateTag: updateTagMock,
  deleteTag: deleteTagMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { AppError } from "@/lib/errors";
import {
  createTagAction,
  deleteTagAction,
  updateTagAction,
} from "@/modules/tags/admin-tags.actions";

describe("admin tags actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    createTagMock.mockResolvedValue(undefined);
    updateTagMock.mockResolvedValue(undefined);
    deleteTagMock.mockResolvedValue(undefined);
  });

  it("createTagAction creates a tag", async () => {
    const formData = new FormData();
    formData.set("name", "TypeScript");
    formData.set("slug", "typescript");

    const result = await createTagAction({ ok: true }, formData);

    expect(result).toEqual({ ok: true, message: "Tag created" });
    expect(createTagMock).toHaveBeenCalledWith({ name: "TypeScript", slug: "typescript" });
  });

  it("updateTagAction updates a tag", async () => {
    const formData = new FormData();
    formData.set("name", "TS");

    const result = await updateTagAction("tag-1", { ok: true }, formData);

    expect(result).toEqual({ ok: true, message: "Tag updated" });
    expect(updateTagMock).toHaveBeenCalledWith("tag-1", { name: "TS" });
  });

  it("deleteTagAction deletes a tag", async () => {
    const result = await deleteTagAction("tag-1");

    expect(result).toEqual({ ok: true, message: "Tag deleted" });
    expect(deleteTagMock).toHaveBeenCalledWith("tag-1");
  });

  it("maps AppError messages on failure", async () => {
    createTagMock.mockRejectedValueOnce(new AppError("Duplicate slug"));

    const formData = new FormData();
    formData.set("name", "TypeScript");

    const result = await createTagAction({ ok: true }, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Duplicate slug");
  });

  it("maps auth failures from requireAdminSession", async () => {
    requireAdminSessionMock.mockRejectedValueOnce(new Error("Forbidden"));

    const result = await deleteTagAction("tag-1");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Forbidden");
  });

  it("maps unknown errors to a generic message", async () => {
    deleteTagMock.mockRejectedValueOnce("boom");

    const result = await deleteTagAction("tag-1");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Something went wrong");
  });
});
