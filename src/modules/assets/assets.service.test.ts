import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { LocalStorageProvider } from "@/modules/assets/local-storage-provider";

const postId = "00000000-0000-4000-8000-000000000001";
const assetId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000099";

const {
  createAssetMetadataRecordMock,
  deleteAssetByIdMock,
  findAssetByIdMock,
  listAssetsByPostIdMock,
  updateAssetByIdMock,
  findPostByIdMock,
  updatePostByIdMock,
} = vi.hoisted(() => ({
  createAssetMetadataRecordMock: vi.fn(),
  deleteAssetByIdMock: vi.fn(),
  findAssetByIdMock: vi.fn(),
  listAssetsByPostIdMock: vi.fn(),
  updateAssetByIdMock: vi.fn(),
  findPostByIdMock: vi.fn(),
  updatePostByIdMock: vi.fn(),
}));

vi.mock("@/modules/assets/assets.repository", () => ({
  createAssetMetadataRecord: createAssetMetadataRecordMock,
  deleteAssetById: deleteAssetByIdMock,
  findAssetById: findAssetByIdMock,
  listAssetsByPostId: listAssetsByPostIdMock,
  updateAssetById: updateAssetByIdMock,
}));

vi.mock("@/modules/posts/posts.repository", () => ({
  findPostById: findPostByIdMock,
  updatePostById: updatePostByIdMock,
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    readUploadMaxFileSizeBytes: vi.fn().mockReturnValue(5_000_000),
  };
});

import {
  assertAssetBelongsToPost,
  buildSafeFilename,
  createAssetMetadata,
  deleteAssetMetadata,
  deletePostAsset,
  getAssetById,
  getStorageProvider,
  guessMimeTypeFromStorageKey,
  listAssetsByPost,
  readAssetFile,
  resetStorageProvider,
  setPostCoverAsset,
  setPostOgAsset,
  setStorageProvider,
  updateAssetMetadata,
  uploadPostAsset,
} from "@/modules/assets/assets.service";

const sampleAsset = {
  id: assetId,
  postId,
  storageProvider: "local",
  storageKey: "posts/post-1/photo.png",
  publicUrl: "/api/assets/posts/post-1/photo.png",
  originalFilename: "photo.png",
  safeFilename: "photo.png",
  mimeType: "image/png",
  fileSizeBytes: 100,
  width: null,
  height: null,
  altText: null,
  caption: null,
  hash: "abc",
  createdBy: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProvider = {
  name: "local",
  upload: vi.fn().mockResolvedValue({
    storageKey: "posts/post-1/photo.png",
    publicUrl: "/api/assets/posts/post-1/photo.png",
  }),
  delete: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue(Buffer.from("data")),
};

describe("assets service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageProvider();
    setStorageProvider(mockProvider as never);

    findAssetByIdMock.mockResolvedValue(sampleAsset);
    listAssetsByPostIdMock.mockResolvedValue([]);
    createAssetMetadataRecordMock.mockResolvedValue(sampleAsset);
    updateAssetByIdMock.mockResolvedValue(sampleAsset);
    deleteAssetByIdMock.mockResolvedValue(sampleAsset);
    findPostByIdMock.mockResolvedValue({
      id: postId,
      coverAssetId: assetId,
      ogAssetId: null,
    });
    updatePostByIdMock.mockResolvedValue({ id: postId });
  });

  it("getStorageProvider lazily creates a provider", () => {
    resetStorageProvider();
    const provider = getStorageProvider();
    expect(provider).toBeDefined();
  });

  it("listAssetsByPost delegates to repository", async () => {
    listAssetsByPostIdMock.mockResolvedValueOnce([sampleAsset]);

    await expect(listAssetsByPost(postId)).resolves.toEqual([sampleAsset]);
  });

  it("getAssetById throws when missing", async () => {
    findAssetByIdMock.mockResolvedValueOnce(undefined);

    await expect(getAssetById("00000000-0000-4000-8000-000000000099")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("createAssetMetadata rejects oversized files", async () => {
    await expect(
      createAssetMetadata({
        postId,
        storageProvider: "local",
        storageKey: "posts/post-1/huge.png",
        publicUrl: "/url",
        originalFilename: "huge.png",
        safeFilename: "huge.png",
        mimeType: "image/png",
        fileSizeBytes: 10_000_000,
        createdBy: userId,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updateAssetMetadata throws when asset is missing", async () => {
    updateAssetByIdMock.mockResolvedValueOnce(undefined);

    await expect(updateAssetMetadata(assetId, { altText: "Alt" })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("deleteAssetMetadata deletes storage when provider matches", async () => {
    await deleteAssetMetadata(assetId);

    expect(mockProvider.delete).toHaveBeenCalledWith(sampleAsset.storageKey);
  });

  it("deleteAssetMetadata throws when asset is missing", async () => {
    deleteAssetByIdMock.mockResolvedValueOnce(undefined);

    await expect(deleteAssetMetadata(assetId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleteAssetMetadata skips storage delete for mismatched provider", async () => {
    deleteAssetByIdMock.mockResolvedValueOnce({
      ...sampleAsset,
      storageProvider: "vercel-blob",
    });

    await deleteAssetMetadata(assetId);

    expect(mockProvider.delete).not.toHaveBeenCalled();
  });

  it("assertAssetBelongsToPost rejects foreign assets", async () => {
    findAssetByIdMock.mockResolvedValueOnce({ ...sampleAsset, postId: "00000000-0000-4000-8000-000000000010" });

    await expect(assertAssetBelongsToPost(assetId, postId)).rejects.toBeInstanceOf(ValidationError);
  });

  it("uploadPostAsset uploads and creates metadata", async () => {
    const buffer = Buffer.from("image-data");

    const asset = await uploadPostAsset({
      postId,
      buffer,
      originalFilename: "photo.png",
      mimeType: "image/png",
      userId,
    });

    expect(mockProvider.upload).toHaveBeenCalled();
    expect(createAssetMetadataRecordMock).toHaveBeenCalled();
    expect(asset).toEqual(sampleAsset);
  });

  it("uploadPostAsset throws when post is missing", async () => {
    findPostByIdMock.mockResolvedValueOnce(undefined);

    await expect(
      uploadPostAsset({
        postId,
        buffer: Buffer.from("x"),
        originalFilename: "photo.png",
        mimeType: "image/png",
        userId,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletePostAsset clears cover and og references", async () => {
    findPostByIdMock.mockResolvedValueOnce({
      id: postId,
      coverAssetId: assetId,
      ogAssetId: assetId,
    });

    await deletePostAsset(assetId, userId);

    expect(updatePostByIdMock).toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ coverAssetId: null, ogAssetId: null })
    );
    expect(deleteAssetByIdMock).toHaveBeenCalledWith(assetId);
  });

  it("setPostCoverAsset validates ownership when assetId is set", async () => {
    await setPostCoverAsset(postId, assetId, userId);

    expect(updatePostByIdMock).toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ coverAssetId: assetId })
    );
  });

  it("setPostCoverAsset throws when post is missing", async () => {
    updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(setPostCoverAsset(postId, null, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("setPostOgAsset updates og asset id", async () => {
    await setPostOgAsset(postId, null, userId);

    expect(updatePostByIdMock).toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ ogAssetId: null })
    );
  });

  it("readAssetFile reads from local provider", async () => {
    setStorageProvider(new LocalStorageProvider() as never);

    await expect(readAssetFile(sampleAsset)).rejects.toThrow();
  });

  it("readAssetFile rejects remote assets", async () => {
    await expect(
      readAssetFile({ ...sampleAsset, storageProvider: "vercel-blob" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("buildSafeFilename sanitizes filenames", () => {
    expect(buildSafeFilename("../../secret.png")).not.toContain("..");
  });

  it("guessMimeTypeFromStorageKey detects common extensions", () => {
    expect(guessMimeTypeFromStorageKey("photo.png")).toBe("image/png");
    expect(guessMimeTypeFromStorageKey("photo.gif")).toBe("image/gif");
    expect(guessMimeTypeFromStorageKey("photo.webp")).toBe("image/webp");
    expect(guessMimeTypeFromStorageKey("photo.jpg")).toBe("image/jpeg");
  });

  it("deletePostAsset skips post updates when post is missing", async () => {
    findPostByIdMock.mockResolvedValueOnce(undefined);

    await deletePostAsset(assetId, userId);

    expect(updatePostByIdMock).not.toHaveBeenCalled();
    expect(deleteAssetByIdMock).toHaveBeenCalledWith(assetId);
  });

  it("deletePostAsset clears only cover when og differs", async () => {
    findPostByIdMock.mockResolvedValueOnce({
      id: postId,
      coverAssetId: assetId,
      ogAssetId: "00000000-0000-4000-8000-000000000003",
    });

    await deletePostAsset(assetId, userId);

    expect(updatePostByIdMock).toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ coverAssetId: null, updatedBy: userId })
    );
    expect(updatePostByIdMock).not.toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ ogAssetId: null })
    );
  });

  it("setPostOgAsset validates ownership when assetId is set", async () => {
    await setPostOgAsset(postId, assetId, userId);

    expect(updatePostByIdMock).toHaveBeenCalledWith(
      postId,
      expect.objectContaining({ ogAssetId: assetId })
    );
  });

  it("setPostOgAsset throws when post is missing", async () => {
    updatePostByIdMock.mockResolvedValueOnce(undefined);

    await expect(setPostOgAsset(postId, assetId, userId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("readAssetFile rejects when active provider is not local storage", async () => {
    setStorageProvider(mockProvider as never);

    await expect(readAssetFile(sampleAsset)).rejects.toBeInstanceOf(NotFoundError);
  });
});
