import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/lib/errors";

const {
  dbSelectMock,
  readAdminEmailMock,
  slugExistsMock,
  findTagBySlugMock,
  createTagMock,
  findCategoryBySlugMock,
  createCategoryMock,
  findRedirectBySourcePathMock,
  createDraftMock,
  updateDraftMock,
  publishPostMock,
  uploadPostAssetMock,
  guessMimeTypeFromStorageKeyMock,
  createRedirectMock,
} = vi.hoisted(() => ({
  dbSelectMock: vi.fn(),
  readAdminEmailMock: vi.fn(),
  slugExistsMock: vi.fn(),
  findTagBySlugMock: vi.fn(),
  createTagMock: vi.fn(),
  findCategoryBySlugMock: vi.fn(),
  createCategoryMock: vi.fn(),
  findRedirectBySourcePathMock: vi.fn(),
  createDraftMock: vi.fn(),
  updateDraftMock: vi.fn(),
  publishPostMock: vi.fn(),
  uploadPostAssetMock: vi.fn(),
  guessMimeTypeFromStorageKeyMock: vi.fn(),
  createRedirectMock: vi.fn(),
}));

vi.mock("@/db/get-db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@tgoliveira/secure-auth/drizzle/schema", () => ({
  users: { id: "users.id", email: "users.email" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((left, right) => ({ left, right })),
}));

vi.mock("@/lib/env", () => ({
  readAdminEmail: readAdminEmailMock,
}));

vi.mock("@/modules/posts/posts.repository", () => ({
  slugExists: slugExistsMock,
}));

vi.mock("@/modules/tags/tags.repository", () => ({
  findTagBySlug: findTagBySlugMock,
}));

vi.mock("@/modules/tags/tags.service", () => ({
  createTag: createTagMock,
}));

vi.mock("@/modules/categories/categories.repository", () => ({
  findCategoryBySlug: findCategoryBySlugMock,
}));

vi.mock("@/modules/categories/categories.service", () => ({
  createCategory: createCategoryMock,
}));

vi.mock("@/modules/redirects/redirects.repository", () => ({
  findRedirectBySourcePath: findRedirectBySourcePathMock,
}));

vi.mock("@/modules/posts/posts.service", () => ({
  createDraft: createDraftMock,
  updateDraft: updateDraftMock,
  publishPost: publishPostMock,
}));

vi.mock("@/modules/assets/assets.service", () => ({
  uploadPostAsset: uploadPostAssetMock,
  guessMimeTypeFromStorageKey: guessMimeTypeFromStorageKeyMock,
}));

vi.mock("@/modules/redirects/redirects.service", () => ({
  createRedirect: createRedirectMock,
}));

import {
  createDatabaseImportWriter,
  mapTargetPath,
  normalizeLegacyPath,
  resolveImportUserId,
} from "./github-pages-writer";

const tempFiles: string[] = [];

afterEach(() => {
  for (const filePath of tempFiles.splice(0)) {
    fs.rmSync(filePath, { force: true });
  }
});

describe("github-pages writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "user-1" }]),
        }),
      }),
    });
    readAdminEmailMock.mockReturnValue("admin@example.com");
    slugExistsMock.mockResolvedValue(false);
    findTagBySlugMock.mockResolvedValue(null);
    createTagMock.mockResolvedValue({ id: "tag-1" });
    findCategoryBySlugMock.mockResolvedValue(null);
    createCategoryMock.mockResolvedValue({ id: "cat-1" });
    findRedirectBySourcePathMock.mockResolvedValue(null);
    createDraftMock.mockResolvedValue({ id: "post-1", slug: "my-post" });
    updateDraftMock.mockResolvedValue({ id: "post-1", slug: "my-post" });
    publishPostMock.mockResolvedValue(undefined);
    guessMimeTypeFromStorageKeyMock.mockReturnValue("image/png");
    uploadPostAssetMock.mockResolvedValue({
      id: "asset-1",
      publicUrl: "/api/assets/posts/post-1/cover.png",
    });
    createRedirectMock.mockResolvedValue(undefined);
  });

  it("maps target paths for blog and custom bases", () => {
    expect(mapTargetPath("hello-world", "/blog")).toBe("/blog/hello-world");
    expect(mapTargetPath("hello-world", "/blog/")).toBe("/blog/hello-world");
    expect(mapTargetPath("hello-world", "/articles")).toBe("/articles/hello-world");
    expect(mapTargetPath("hello-world", "//news//")).toBe("/news/hello-world");
  });

  it("normalizes legacy paths against a base old path", () => {
    expect(normalizeLegacyPath("/legacy/post", "/")).toBe("/legacy/post");
    expect(normalizeLegacyPath("/legacy/post/", "/legacy")).toBe("/post");
    expect(normalizeLegacyPath("legacy/post", "/")).toBe("/legacy/post");
    expect(normalizeLegacyPath("/legacy/", "/legacy")).toBe("/");
  });

  it("resolves import user id from author email or admin email", async () => {
    await expect(resolveImportUserId("Admin@Example.com")).resolves.toBe("user-1");
    expect(dbSelectMock).toHaveBeenCalled();
  });

  it("throws when no email is configured", async () => {
    readAdminEmailMock.mockReturnValue(undefined);
    await expect(resolveImportUserId()).rejects.toThrow(/ADMIN_EMAIL/);
  });

  it("throws when user is not found", async () => {
    dbSelectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(resolveImportUserId("missing@example.com")).rejects.toThrow(/No user found/);
  });

  it("delegates writer operations to repositories and services", async () => {
    const writer = createDatabaseImportWriter("user-1");

    await expect(writer.slugExists("my-post")).resolves.toBe(false);
    expect(slugExistsMock).toHaveBeenCalledWith("my-post");

    await expect(writer.findOrCreateTag("News")).resolves.toEqual({
      id: "tag-1",
      created: true,
    });
    expect(createTagMock).toHaveBeenCalledWith({ name: "News", slug: "news" });

    findTagBySlugMock.mockResolvedValueOnce({ id: "tag-existing" });
    await expect(writer.findOrCreateTag("News")).resolves.toEqual({
      id: "tag-existing",
      created: false,
    });

    await expect(writer.findOrCreateCategory("Updates")).resolves.toEqual({
      id: "cat-1",
      created: true,
    });

    findCategoryBySlugMock.mockResolvedValueOnce({ id: "cat-existing" });
    await expect(writer.findOrCreateCategory("Updates")).resolves.toEqual({
      id: "cat-existing",
      created: false,
    });

    await expect(writer.redirectExists("/old-path")).resolves.toBe(false);
    findRedirectBySourcePathMock.mockResolvedValueOnce({ id: "redirect-1" });
    await expect(writer.redirectExists("/old-path")).resolves.toBe(true);

    await expect(
      writer.createDraft({
        title: "Title",
        slug: "title",
        contentMarkdown: "Body",
        tagIds: ["tag-1"],
      })
    ).resolves.toEqual({ id: "post-1", slug: "my-post" });

    await expect(
      writer.updateDraft("post-1", { contentMarkdown: "Updated" })
    ).resolves.toEqual({ id: "post-1", slug: "my-post" });

    await writer.publishPost("post-1", new Date("2024-01-15T00:00:00.000Z"));
    expect(publishPostMock).toHaveBeenCalledWith(
      "post-1",
      "user-1",
      expect.objectContaining({ publishedAt: new Date("2024-01-15T00:00:00.000Z") })
    );

    await writer.publishPost("post-2");
    expect(publishPostMock).toHaveBeenCalledWith("post-2", "user-1", {});

    await writer.createRedirect("/old", "/blog/new");
    expect(createRedirectMock).toHaveBeenCalledWith({
      sourcePath: "/old",
      targetPath: "/blog/new",
      statusCode: 301,
    });

    await expect(writer.resolveUserId("admin@example.com")).resolves.toBe("user-1");
  });

  it("recovers from tag and category conflict errors", async () => {
    const writer = createDatabaseImportWriter("user-1");

    createTagMock.mockRejectedValueOnce(new ConflictError("Tag exists"));
    findTagBySlugMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "tag-fallback" });
    await expect(writer.findOrCreateTag("News")).resolves.toEqual({
      id: "tag-fallback",
      created: false,
    });

    createCategoryMock.mockRejectedValueOnce(new ConflictError("Category exists"));
    findCategoryBySlugMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "cat-fallback" });
    await expect(writer.findOrCreateCategory("Updates")).resolves.toEqual({
      id: "cat-fallback",
      created: false,
    });
  });

  it("uploads local images through the asset service", async () => {
    const imagePath = path.join(os.tmpdir(), `postforge-writer-image-${Date.now()}.png`);
    fs.writeFileSync(imagePath, "fake-image", "utf8");
    tempFiles.push(imagePath);

    const writer = createDatabaseImportWriter("user-1");
    const result = await writer.uploadLocalImage({
      postId: "post-1",
      absolutePath: imagePath,
      altText: "Cover",
    });

    expect(result).toEqual({
      publicUrl: "/api/assets/posts/post-1/cover.png",
      assetId: "asset-1",
    });
    expect(uploadPostAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: "post-1",
        mimeType: "image/png",
        altText: "Cover",
        userId: "user-1",
      })
    );
  });
});
