import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  countTagUsageMock,
  deleteTagByIdMock,
  findTagByIdMock,
  findTagByNameCaseInsensitiveMock,
  findTagBySlugMock,
  insertTagMock,
  listTagsMock,
  updateTagByIdMock,
} = vi.hoisted(() => ({
  countTagUsageMock: vi.fn(),
  deleteTagByIdMock: vi.fn(),
  findTagByIdMock: vi.fn(),
  findTagByNameCaseInsensitiveMock: vi.fn(),
  findTagBySlugMock: vi.fn(),
  insertTagMock: vi.fn(),
  listTagsMock: vi.fn(),
  updateTagByIdMock: vi.fn(),
}));

vi.mock("./tags.repository", () => ({
  countTagUsage: countTagUsageMock,
  deleteTagById: deleteTagByIdMock,
  findTagById: findTagByIdMock,
  findTagByNameCaseInsensitive: findTagByNameCaseInsensitiveMock,
  findTagBySlug: findTagBySlugMock,
  insertTag: insertTagMock,
  listTags: listTagsMock,
  listAdminTags: vi.fn().mockResolvedValue([]),
  updateTagById: updateTagByIdMock,
}));

import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  createTag,
  deleteTag,
  getTagBySlug,
  getTagUsageCount,
  listAdminTags,
  listTags,
  updateTag,
} from "./tags.service";

const sampleTag = {
  id: "tag-1",
  name: "News",
  slug: "news",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("tags service CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findTagByNameCaseInsensitiveMock.mockResolvedValue(undefined);
    findTagBySlugMock.mockResolvedValue(undefined);
    findTagByIdMock.mockResolvedValue(sampleTag);
    insertTagMock.mockResolvedValue(sampleTag);
    updateTagByIdMock.mockResolvedValue({ ...sampleTag, name: "Updated News" });
    listTagsMock.mockResolvedValue([sampleTag]);
    countTagUsageMock.mockResolvedValue(0);
    deleteTagByIdMock.mockResolvedValue(true);
  });

  it("creates a tag with a generated slug", async () => {
    const tag = await createTag({ name: "News" });

    expect(insertTagMock).toHaveBeenCalledWith({ name: "News", slug: "news" });
    expect(tag).toEqual(sampleTag);
  });

  it("rejects duplicate tag names on create", async () => {
    findTagByNameCaseInsensitiveMock.mockResolvedValue(sampleTag);

    await expect(createTag({ name: "News" })).rejects.toBeInstanceOf(ConflictError);
    expect(insertTagMock).not.toHaveBeenCalled();
  });

  it("updates an existing tag", async () => {
    const updated = await updateTag("tag-1", { name: "Updated News" });

    expect(updateTagByIdMock).toHaveBeenCalledWith("tag-1", { name: "Updated News", slug: undefined });
    expect(updated.name).toBe("Updated News");
  });

  it("throws NotFoundError when updating a missing tag", async () => {
    findTagByIdMock.mockResolvedValue(undefined);

    await expect(updateTag("missing", { name: "X" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists tags from the repository", async () => {
    await expect(listTags()).resolves.toEqual([sampleTag]);
    expect(listTagsMock).toHaveBeenCalled();
  });

  it("deletes an unused tag", async () => {
    await deleteTag("tag-1");

    expect(deleteTagByIdMock).toHaveBeenCalledWith("tag-1");
  });

  it("throws NotFoundError when deleting a missing tag", async () => {
    deleteTagByIdMock.mockResolvedValue(false);

    await expect(deleteTag("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects duplicate slugs on create", async () => {
    findTagBySlugMock.mockResolvedValue(sampleTag);

    await expect(createTag({ name: "Other", slug: "news" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid slugs on create", async () => {
    await expect(createTag({ name: "Bad", slug: "---" })).rejects.toThrow(/slug/i);
  });

  it("rejects slug conflicts on update", async () => {
    findTagBySlugMock.mockResolvedValue({ ...sampleTag, id: "other" });

    await expect(updateTag("tag-1", { slug: "news" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws when update returns no row", async () => {
    updateTagByIdMock.mockResolvedValue(undefined);

    await expect(updateTag("tag-1", { name: "Updated News" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects deleting tags that are in use", async () => {
    countTagUsageMock.mockResolvedValue(2);

    await expect(deleteTag("tag-1")).rejects.toBeInstanceOf(ConflictError);
  });

  it("gets tag by slug and usage count", async () => {
    findTagBySlugMock.mockResolvedValue(sampleTag);
    countTagUsageMock.mockResolvedValue(4);

    await expect(getTagBySlug("news")).resolves.toEqual(sampleTag);
    await expect(getTagUsageCount("tag-1")).resolves.toBe(4);
    await expect(listAdminTags()).resolves.toEqual([]);
  });

  it("throws when tag slug is missing", async () => {
    findTagBySlugMock.mockResolvedValue(undefined);

    await expect(getTagBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
