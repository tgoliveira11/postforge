import { beforeEach, describe, expect, it, vi } from "vitest";

const { safeFetchBinaryMock, uploadPostAssetMock } = vi.hoisted(() => ({
  safeFetchBinaryMock: vi.fn(),
  uploadPostAssetMock: vi.fn(),
}));

vi.mock("./url-fetch", () => ({
  safeFetchBinary: safeFetchBinaryMock,
}));

vi.mock("@/modules/assets/assets.service", () => ({
  uploadPostAsset: uploadPostAssetMock,
}));

vi.mock("@/lib/env", () => ({
  readUploadMaxFileSizeBytes: vi.fn().mockReturnValue(1000),
}));

import { ValidationError } from "@/lib/errors";
import { downloadAndUploadMainImage } from "./url-post-images";

describe("url post images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadPostAssetMock.mockResolvedValue({
      id: "asset-1",
      publicUrl: "/api/assets/posts/post-1/cover.png",
    });
  });

  it("downloads and uploads a supported image", async () => {
    safeFetchBinaryMock.mockResolvedValue({
      contentType: "image/png",
      body: Buffer.from("png-data"),
    });

    const result = await downloadAndUploadMainImage({
      imageUrl: "https://example.com/images/cover.png",
      postId: "00000000-0000-4000-8000-000000000001",
      title: "Cover",
      userId: "00000000-0000-4000-8000-000000000099",
    });

    expect(result.assetId).toBe("asset-1");
    expect(uploadPostAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        originalFilename: "imported-cover.png",
        mimeType: "image/png",
      })
    );
  });

  it("rejects unsupported image content types", async () => {
    safeFetchBinaryMock.mockResolvedValue({
      contentType: "application/pdf",
      body: Buffer.from("pdf"),
    });

    await expect(
      downloadAndUploadMainImage({
        imageUrl: "https://example.com/file.pdf",
        postId: "00000000-0000-4000-8000-000000000001",
        title: "Cover",
        userId: "00000000-0000-4000-8000-000000000099",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects images that exceed the upload limit", async () => {
    safeFetchBinaryMock.mockResolvedValue({
      contentType: "image/jpeg",
      body: Buffer.alloc(2000),
    });

    await expect(
      downloadAndUploadMainImage({
        imageUrl: "https://example.com/cover.jpg",
        postId: "00000000-0000-4000-8000-000000000001",
        title: "Cover",
        userId: "00000000-0000-4000-8000-000000000099",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("falls back to mime-based extension when URL has no extension", async () => {
    safeFetchBinaryMock.mockResolvedValue({
      contentType: "image/webp; charset=binary",
      body: Buffer.from("webp"),
    });

    await downloadAndUploadMainImage({
      imageUrl: "https://example.com/no-extension",
      postId: "00000000-0000-4000-8000-000000000001",
      title: "Cover",
      userId: "00000000-0000-4000-8000-000000000099",
    });

    expect(uploadPostAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({ originalFilename: "imported-cover.webp" })
    );
  });
});
