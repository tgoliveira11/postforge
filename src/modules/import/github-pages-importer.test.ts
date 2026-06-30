import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildImportConfigFromOptions,
  runGitHubPagesImport,
  runGitHubPagesImportAndPersistReport,
} from "./github-pages-importer";
import { createEmptyImportReport, formatImportReportSummary } from "./github-pages-report";
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
    findOrCreateTag: vi.fn().mockResolvedValue({ id: "tag-1", created: true }),
    findOrCreateCategory: vi.fn().mockResolvedValue({ id: "cat-1", created: true }),
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

const config: GitHubPagesImportConfig = {
  sourceRoot: "/legacy",
  assetsRoot: "/legacy/assets",
  mode: "dry-run",
  defaultStatus: "draft",
  publishImported: false,
  preserveUrls: true,
  baseOldPath: "/",
  baseNewPath: "/blog",
  reportDir: ".import-reports",
};

describe("github-pages importer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dry-run validates posts without writing drafts", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(config, writer);

    expect(writer.createDraft).not.toHaveBeenCalled();
    expect(report.entries[0]?.status).toBe("planned");
    expect(report.redirectsCreated.length).toBeGreaterThan(0);
  });

  it("skips slug conflicts instead of overwriting", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter({
      slugExists: vi.fn().mockResolvedValue(true),
    });

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(writer.createDraft).not.toHaveBeenCalled();
    expect(report.slugConflicts).toHaveLength(1);
    expect(report.entries[0]?.status).toBe("skipped");
  });

  it("imports drafts by default and does not publish", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(writer.createDraft).toHaveBeenCalled();
    expect(writer.publishPost).not.toHaveBeenCalled();
    expect(report.postsCreated).toBe(1);
    expect(report.entries[0]?.status).toBe("imported");
  });

  it("formats import report summaries", () => {
    const report = createEmptyImportReport("dry-run");
    report.totalFilesScanned = 2;
    const summary = formatImportReportSummary(report);
    expect(summary).toContain("dry-run");
    expect(summary).toContain("Files scanned: 2");
  });

  it("builds import config from CLI-style options", () => {
    const config = buildImportConfigFromOptions({
      source: "/legacy/site",
      mode: "import",
      assets: "/legacy/assets",
      defaultStatus: "published",
      publishImported: true,
      preserveUrls: false,
      baseOldPath: "/blog",
      baseNewPath: "/articles",
      authorEmail: "author@example.com",
      reportDir: "/tmp/reports",
    });

    expect(config.sourceRoot).toBe(path.resolve("/legacy/site"));
    expect(config.assetsRoot).toBe(path.resolve("/legacy/assets"));
    expect(config.mode).toBe("import");
    expect(config.defaultStatus).toBe("published");
    expect(config.publishImported).toBe(true);
    expect(config.preserveUrls).toBe(false);
    expect(config.baseOldPath).toBe("/blog");
    expect(config.baseNewPath).toBe("/articles");
    expect(config.authorEmail).toBe("author@example.com");
    expect(config.reportDir).toBe("/tmp/reports");
  });

  it("skips posts with parser validation errors", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({ errors: ["Invalid slug derived: !!!"] }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(writer.createDraft).not.toHaveBeenCalled();
    expect(report.validationErrors).toHaveLength(1);
    expect(report.entries[0]?.status).toBe("skipped");
  });

  it("publishes imported posts when publishImported is enabled", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter();

    await runGitHubPagesImport(
      { ...config, mode: "import", publishImported: true },
      writer
    );

    expect(writer.publishPost).toHaveBeenCalledWith(
      "post-1",
      new Date("2024-01-15T00:00:00.000Z")
    );
  });

  it("publishes all posts when publishImported and default status are published", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({ sourceStatus: "unknown", publishedAt: null }),
    ]);
    const writer = createMockWriter();

    await runGitHubPagesImport(
      { ...config, mode: "import", publishImported: true, defaultStatus: "published" },
      writer
    );

    expect(writer.publishPost).toHaveBeenCalledWith("post-1", undefined);
  });

  it("records unsupported frontmatter and published-as-draft warnings", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        unsupportedFrontmatter: ["layout"],
        warnings: ["Legacy warning"],
        sourceStatus: "published",
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(report.unsupportedFrontmatter).toEqual([
      { file: "my-post.md", fields: ["layout"] },
    ]);
    expect(report.warnings).toContain("my-post.md: Legacy warning");
    expect(report.warnings.some((warning) => warning.includes("imported as draft"))).toBe(
      true
    );
  });

  it("warns when multiple categories are present", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({ categories: ["Updates", "News"] }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(writer.findOrCreateCategory).toHaveBeenCalledWith("Updates");
    expect(report.warnings.some((warning) => warning.includes("multiple categories"))).toBe(
      true
    );
  });

  it("warns when a separate OG image is declared", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([
      samplePost({
        coverImageRef: "./images/cover.png",
        ogImageRef: "./images/og.png",
      }),
    ]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(
      report.warnings.some((warning) => warning.includes("Separate OG image frontmatter"))
    ).toBe(true);
  });

  it("skips redirect creation when preserveUrls is disabled", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter();

    const report = await runGitHubPagesImport(
      { ...config, mode: "import", preserveUrls: false },
      writer
    );

    expect(writer.createRedirect).not.toHaveBeenCalled();
    expect(report.redirectsCreated).toHaveLength(0);
    expect(report.entries[0]?.status).toBe("imported");
  });

  it("skips redirects that already exist", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter({
      redirectExists: vi.fn().mockResolvedValue(true),
    });

    const report = await runGitHubPagesImport({ ...config, mode: "dry-run" }, writer);

    expect(writer.createRedirect).not.toHaveBeenCalled();
    expect(report.redirectsSkipped).toHaveLength(1);
    expect(report.redirectsSkipped[0]?.reason).toBe("Redirect already exists");
  });

  it("records import errors without stopping the run", async () => {
    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter({
      createDraft: vi.fn().mockRejectedValue(new Error("Database unavailable")),
    });

    const report = await runGitHubPagesImport({ ...config, mode: "import" }, writer);

    expect(report.validationErrors).toEqual([
      { file: "my-post.md", error: "Database unavailable" },
    ]);
    expect(report.entries[0]?.status).toBe("error");
  });

  it("persists import reports to disk", async () => {
    const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), "postforge-import-report-"));
    tempDirs.push(reportDir);

    vi.mocked(readLegacyMarkdownFiles).mockResolvedValue([samplePost()]);
    const writer = createMockWriter();

    const result = await runGitHubPagesImportAndPersistReport(
      { ...config, mode: "dry-run", reportDir },
      writer
    );

    expect(result.reportPath.startsWith(reportDir)).toBe(true);
    expect(fs.existsSync(result.reportPath)).toBe(true);
    expect(result.summary).toContain("dry-run");
    expect(result.report.entries[0]?.status).toBe("planned");
  });
});
