import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertWithinAllowedRoots,
  isSafeRelativeImagePath,
  normalizeTagOrCategoryList,
  normalizeUrlPath,
  resolveSafePath,
} from "@/modules/import/github-pages.validation";

describe("github-pages validation branches", () => {
  it("resolveSafePath rejects absolute escape paths", () => {
    const root = path.resolve("/tmp/import-root");
    expect(() => resolveSafePath(root, "/etc/passwd")).toThrow(/escapes source root/i);
  });

  it("assertWithinAllowedRoots accepts assets root paths", () => {
    const sourceRoot = path.resolve("/tmp/source");
    const assetsRoot = path.resolve("/tmp/assets");
    const target = path.join(assetsRoot, "images/cover.png");

    expect(() => assertWithinAllowedRoots(target, sourceRoot, assetsRoot)).not.toThrow();
  });

  it("assertWithinAllowedRoots rejects paths outside both roots", () => {
    expect(() =>
      assertWithinAllowedRoots("/tmp/outside/file.png", "/tmp/source", "/tmp/assets")
    ).toThrow(/escapes allowed import roots/i);
  });

  it("isSafeRelativeImagePath rejects null bytes in paths", () => {
    expect(isSafeRelativeImagePath("images/a.png\0")).toBe(false);
  });

  it("normalizeUrlPath trims trailing slashes", () => {
    expect(normalizeUrlPath("/blog/post/")).toBe("/blog/post");
  });

  it("normalizeTagOrCategoryList deduplicates mixed delimiters", () => {
    expect(normalizeTagOrCategoryList("News; updates|News")).toEqual(["News", "updates"]);
    expect(normalizeTagOrCategoryList(null)).toEqual([]);
  });
});
