import { describe, expect, it } from "vitest";
import {
  assertAllowedUpload,
  assertSafeStorageKey,
  buildUniqueSafeFilename,
  getFileExtension,
  isAllowedImageMimeType,
  sanitizeFilename,
} from "@/modules/assets/assets.validation";

describe("assets validation branches", () => {
  it("rejects blocked extensions and unsupported mime types", () => {
    expect(() =>
      assertAllowedUpload({
        mimeType: "image/png",
        originalFilename: "script.js",
        fileSizeBytes: 100,
        maxFileSizeBytes: 1024,
      })
    ).toThrow(/extension/i);

    expect(() =>
      assertAllowedUpload({
        mimeType: "image/bmp",
        originalFilename: "photo.bmp",
        fileSizeBytes: 100,
        maxFileSizeBytes: 1024,
      })
    ).toThrow(/mime type/i);
  });

  it("rejects empty files", () => {
    expect(() =>
      assertAllowedUpload({
        mimeType: "image/png",
        originalFilename: "photo.png",
        fileSizeBytes: 0,
        maxFileSizeBytes: 1024,
      })
    ).toThrow(/empty/i);
  });

  it("sanitizes empty filenames to a fallback", () => {
    expect(sanitizeFilename("!!!")).toBe("-");
    expect(sanitizeFilename("")).toBe("file");
  });

  it("returns empty extension when none is present", () => {
    expect(getFileExtension("photo")).toBe("");
  });

  it("checks allowed mime types", () => {
    expect(isAllowedImageMimeType("image/png")).toBe(true);
    expect(isAllowedImageMimeType("image/bmp")).toBe(false);
  });

  it("builds unique filenames with incrementing suffixes", () => {
    expect(buildUniqueSafeFilename("photo.png", ["photo.png", "photo-2.png"])).toBe("photo-3.png");
  });

  it("rejects unsafe storage keys", () => {
    expect(() => assertSafeStorageKey("../escape")).toThrow(/invalid storage key/i);
    expect(() => assertSafeStorageKey("/absolute")).toThrow(/invalid storage key/i);
    expect(() => assertSafeStorageKey("folder\\file")).toThrow(/invalid storage key/i);
  });
});
