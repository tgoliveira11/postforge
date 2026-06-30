import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  updateAssetMetadataMock,
  getAssetByIdMock,
  deletePostAssetMock,
  setPostCoverAssetMock,
  setPostOgAssetMock,
  getByIdMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  updateAssetMetadataMock: vi.fn(),
  getAssetByIdMock: vi.fn(),
  deletePostAssetMock: vi.fn(),
  setPostCoverAssetMock: vi.fn(),
  setPostOgAssetMock: vi.fn(),
  getByIdMock: vi.fn(),
}));

vi.mock("@/modules/admin/authorization", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/modules/assets/assets.service", () => ({
  updateAssetMetadata: updateAssetMetadataMock,
  getAssetById: getAssetByIdMock,
  deletePostAsset: deletePostAssetMock,
  setPostCoverAsset: setPostCoverAssetMock,
  setPostOgAsset: setPostOgAssetMock,
}));

vi.mock("@/modules/posts/posts.service", () => ({
  getById: getByIdMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/admin/revalidate-public", () => ({
  revalidatePublicPaths: vi.fn(),
}));

import {
  deleteAssetAction,
  setPostCoverAssetAction,
  setPostOgAssetAction,
  updateAssetMetadataAction,
} from "@/modules/assets/admin-assets.actions";

describe("admin assets actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    updateAssetMetadataMock.mockResolvedValue({ id: "asset-1", postId: "post-1" });
    getAssetByIdMock.mockResolvedValue({ id: "asset-1", postId: "post-1" });
    deletePostAssetMock.mockResolvedValue(undefined);
    setPostCoverAssetMock.mockResolvedValue(undefined);
    setPostOgAssetMock.mockResolvedValue(undefined);
    getByIdMock.mockResolvedValue({ id: "post-1", slug: "hello" });
  });

  it("updateAssetMetadataAction updates alt text and caption", async () => {
    const formData = new FormData();
    formData.set("altText", "Diagram");
    formData.set("caption", "Figure 1");

    const result = await updateAssetMetadataAction("asset-1", { ok: true }, formData);

    expect(result).toEqual({ ok: true, message: "Asset updated" });
    expect(updateAssetMetadataMock).toHaveBeenCalledWith("asset-1", {
      altText: "Diagram",
      caption: "Figure 1",
    });
  });

  it("deleteAssetAction deletes the asset", async () => {
    const result = await deleteAssetAction("asset-1");

    expect(result).toEqual({ ok: true, message: "Asset deleted" });
    expect(deletePostAssetMock).toHaveBeenCalledWith("asset-1", "admin-1");
  });

  it("setPostCoverAssetAction sets cover image", async () => {
    const result = await setPostCoverAssetAction("post-1", "asset-1");

    expect(result).toEqual({ ok: true, message: "Cover image set" });
    expect(setPostCoverAssetMock).toHaveBeenCalledWith("post-1", "asset-1", "admin-1");
  });

  it("setPostCoverAssetAction clears cover image", async () => {
    const result = await setPostCoverAssetAction("post-1", null);

    expect(result).toEqual({ ok: true, message: "Cover image cleared" });
  });

  it("setPostOgAssetAction sets og image", async () => {
    const result = await setPostOgAssetAction("post-1", "asset-1");

    expect(result).toEqual({ ok: true, message: "OG image set" });
  });

  it("setPostOgAssetAction clears og image", async () => {
    const result = await setPostOgAssetAction("post-1", null);

    expect(result).toEqual({ ok: true, message: "OG image cleared" });
  });

  it("returns errors from the service layer", async () => {
    updateAssetMetadataMock.mockRejectedValueOnce(new Error("Asset not found"));

    const result = await updateAssetMetadataAction("asset-1", { ok: true }, new FormData());

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Asset not found");
  });

  it("maps AppError and unknown failures", async () => {
    const { AppError } = await import("@/lib/errors");
    updateAssetMetadataMock.mockRejectedValueOnce(new AppError("Invalid asset", "VALIDATION_ERROR", 400));

    const result = await updateAssetMetadataAction("asset-1", { ok: true }, new FormData());
    expect(result).toEqual({ ok: false, error: "Invalid asset" });

    deletePostAssetMock.mockRejectedValueOnce("broken");
    const deleteResult = await deleteAssetAction("asset-1");
    expect(deleteResult).toEqual({ ok: false, error: "Something went wrong" });
  });

  it("normalizes empty alt text fields to null", async () => {
    const formData = new FormData();
    formData.set("altText", "");

    await updateAssetMetadataAction("asset-1", { ok: true }, formData);

    expect(updateAssetMetadataMock).toHaveBeenCalledWith("asset-1", {
      altText: null,
      caption: undefined,
    });
  });
});
