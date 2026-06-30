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
  createAssetMetadataRecord,
  deleteAssetById,
  findAssetById,
  insertAsset,
  listAssetsByPostId,
  updateAssetById,
} from "@/modules/assets/assets.repository";

const sampleAsset = {
  id: "asset-1",
  postId: "post-1",
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
  hash: null,
  createdBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("assets repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    returningMock.mockResolvedValue([sampleAsset]);
    setMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ returning: returningMock, limit: limitMock, orderBy: orderByMock });
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });
    updateMock.mockReturnValue({ set: setMock });
    deleteMock.mockReturnValue({ where: whereMock });

    limitMock.mockResolvedValue([sampleAsset]);
    orderByMock.mockReturnValue({ limit: limitMock });
    orderByMock.mockResolvedValue([sampleAsset]);
    fromMock.mockReturnValue({ where: whereMock, orderBy: orderByMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("insertAsset returns inserted row", async () => {
    await expect(insertAsset(sampleAsset)).resolves.toEqual(sampleAsset);
  });

  it("updateAssetById returns updated row", async () => {
    await expect(updateAssetById("asset-1", { altText: "Alt" })).resolves.toEqual(sampleAsset);
  });

  it("findAssetById returns undefined when missing", async () => {
    limitMock.mockResolvedValueOnce([]);

    await expect(findAssetById("missing")).resolves.toBeUndefined();
  });

  it("listAssetsByPostId orders by createdAt desc", async () => {
    await expect(listAssetsByPostId("post-1")).resolves.toEqual([sampleAsset]);
    expect(orderByMock).toHaveBeenCalled();
  });

  it("deleteAssetById returns deleted row", async () => {
    await expect(deleteAssetById("asset-1")).resolves.toEqual(sampleAsset);
  });

  it("createAssetMetadataRecord inserts with defaults", async () => {
    await expect(
      createAssetMetadataRecord({
        postId: "post-1",
        storageProvider: "local",
        storageKey: "key",
        publicUrl: "/url",
        originalFilename: "photo.png",
        safeFilename: "photo.png",
        mimeType: "image/png",
        fileSizeBytes: 100,
        createdBy: "user-1",
      })
    ).resolves.toEqual(sampleAsset);
  });
});
