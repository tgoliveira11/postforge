import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runGitHubPagesImport, buildImportConfigFromOptions } from "./github-pages-importer";
import type { GitHubPagesImportConfig, ImportWriter, ParsedLegacyPost } from "./github-pages.types";

vi.mock("./github-pages-parser", () => ({
  readLegacyMarkdownFiles: vi.fn(),
}));

import { readLegacyMarkdownFiles } from "./github-pages-parser";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTempSource(structure: Record<string, string | Buffer>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "postforge-import-"));
  tempDirs.push(root);

  for (const [relativePath, content] of Object.entries(structure)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (typeof content === "string") {
      fs.writeFileSync(filePath, content, "utf8");
    } else {
      fs.writeFileSync(filePath, content);
    }
  }

  return root;
}

function samplePost(overrides: Partial<ParsedLegacyPost> = {}): ParsedLegacyPost {
  return {
    sourcePath: "/legacy/my-post.md",
    relativePath: "my-post.md",
    title: "My Post",
    desiredSlug: "my-post",
    excerpt: "Summary",
    contentMarkdown: "![cover](./images/cover.png)",
    publishedAt: new Date("2024-01-15T00:00:00.000Z"),
    sourceStatus: "published",
    tags: ["news"],
    categories: ["Updates"],
    coverImageRef: "./images/cover.png",
    ogImageRef: null,
    oldPaths: ["/legacy/my-post"],
    unsupportedFrontmatter: [],
    warnings: [],
    errors: [],
    ...overrides,
  };
}

function createMockWriter(overrides: Partial<ImportWriter> = {}): ImportWriter {
  return {
    slugExists: vi.fn().mockResolvedValue(false),
    findOrCreateTag: vi.fn().mockResolvedValue({ id: "tag-1", created: false }),
    findOrCreateCategory: vi.fn().mockResolvedValue({ id: "cat-1", created: false }),
    redirectExists: vi.fn().mockResolvedValue(false),
    createDraft: vi.fn().mockResolvedValue({ id: "post-1", slug: "my-post" }),
    updateDraft: vi.fn().mockResolvedValue({ id: "post-1", slug: "my-post" }),
    publishPost: vi.fn().mockResolvedValue(undefined),
    uploadLocalImage: vi.fn().mockResolvedValue({
      publicUrl: "/api/assets/posts/post-1/cover.png",
      assetId: "asset-1",
    }),
    createRedirect: vi.fn().mockResolvedValue(undefined),
    resolveUserId: vi.fn().mockResolvedValue("user-1"),
    ...overrides,
  };
}

const baseConfig: GitHubPagesImportConfig = {
  sourceRoot: "/legacy",
  assetsRoot: "/legacy/assets",
  mode: "import",
  defaultStatus: "draft",
  publishImported: false,
  preserveUrls: true,
  baseOldPath: "/",
  baseNewPath: "/blog",
  reportDir: ".import-reports",
};

describe("github-pages importer branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips redirects when old path equals target path", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({ oldPaths: ["/blog/my-post"] }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(
      { ...baseConfig, mode: "dry-run", baseOldPath: "/", baseNewPath: "/blog" },
      writer
    );

    expect(writer.createRedirect).not.toHaveBeenCalled();
    expect(report.redirectsCreated).toHaveLength(0);
  });

  it("preserves remote markdown images without uploading", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        contentMarkdown: "![remote](https://cdn.example.com/remote.png)",
        coverImageRef: null,
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(baseConfig, writer);

    expect(writer.uploadLocalImage).not.toHaveBeenCalled();
    expect(report.remoteImagesPreserved).toHaveLength(1);
  });

  it("records missing local images during import", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        contentMarkdown: "![missing](./images/missing.png)",
        coverImageRef: null,
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(baseConfig, writer);

    expect(report.imagesMissing).toHaveLength(1);
    expect(report.warnings.some((warning) => warning.includes("Missing local image"))).toBe(true);
  });

  it("copies local markdown images during import mode", async () => {
    const sourceRoot = createTempSource({
      "images/cover.png": Buffer.from("png"),
      "my-post.md": "# Post",
    });
    const markdownPath = path.join(sourceRoot, "my-post.md");

    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        sourcePath: markdownPath,
        contentMarkdown: "![cover](./images/cover.png)",
        coverImageRef: null,
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(
      { ...baseConfig, sourceRoot, assetsRoot: sourceRoot },
      writer
    );

    expect(writer.uploadLocalImage).toHaveBeenCalled();
    expect(report.imagesCopied.length).toBeGreaterThan(0);
  });

  it("warns when cover image is remote", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        contentMarkdown: "Body",
        coverImageRef: "https://cdn.example.com/cover.png",
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(baseConfig, writer);

    expect(
      report.warnings.some((warning) => warning.includes("Remote cover image preserved"))
    ).toBe(true);
  });

  it("records missing cover images", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        contentMarkdown: "Body",
        coverImageRef: "./images/missing-cover.png",
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(baseConfig, writer);

    expect(report.imagesMissing.some((entry) => entry.reference.includes("missing-cover"))).toBe(
      true
    );
  });

  it("uploads cover images during import mode", async () => {
    const sourceRoot = createTempSource({
      "images/cover.png": Buffer.from("png"),
      "my-post.md": "# Post",
    });

    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        sourcePath: path.join(sourceRoot, "my-post.md"),
        contentMarkdown: "Body",
        coverImageRef: "./images/cover.png",
      }),
    ]);
    const writer = createMockWriter();

    await runGitHubPagesImport({ ...baseConfig, sourceRoot, assetsRoot: sourceRoot }, writer);

    expect(writer.uploadLocalImage).toHaveBeenCalled();
  });

  it("records created tags and categories", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter({
      findOrCreateTag: vi.fn().mockResolvedValue({ id: "tag-1", created: true }),
      findOrCreateCategory: vi.fn().mockResolvedValue({ id: "cat-1", created: true }),
    });

    const report = await runGitHubPagesImport(baseConfig, writer);

    expect(report.tagsCreated).toEqual(["news"]);
    expect(report.categoriesCreated).toEqual(["Updates"]);
  });

  it("records non-error import failures", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter({
      createDraft: vi.fn().mockRejectedValue("boom"),
    });

    const report = await runGitHubPagesImport(baseConfig, writer);

    expect(report.validationErrors).toEqual([
      { file: "my-post.md", error: "Unknown import error" },
    ]);
  });

  it("buildImportConfigFromOptions applies defaults", () => {
    const config = buildImportConfigFromOptions({
      source: "/legacy/site",
      mode: "import",
    });

    expect(config.assetsRoot).toBeUndefined();
    expect(config.defaultStatus).toBe("draft");
    expect(config.publishImported).toBe(false);
    expect(config.preserveUrls).toBe(true);
    expect(config.baseOldPath).toBe("/");
    expect(config.baseNewPath).toBe("/blog");
    expect(config.reportDir).toContain(".import-reports");
  });
});
