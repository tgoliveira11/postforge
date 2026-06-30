import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectMarkdownFiles,
  deriveDesiredSlug,
  deriveLegacySourceStatus,
  deriveOldPaths,
  deriveSlugFromFilename,
  deriveSlugFromPermalink,
  parseLegacyDate,
  parseLegacyMarkdownFile,
  readLegacyMarkdownFiles,
} from "./github-pages-parser";
import { normalizeTagOrCategoryList, normalizeUrlPath, resolveSafePath } from "./github-pages.validation";

const tempPaths: string[] = [];

afterEach(() => {
  for (const tempPath of tempPaths.splice(0)) {
    fs.rmSync(tempPath, { recursive: true, force: true });
  }
});

function createTempSourceTree(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "postforge-parser-"));
  tempPaths.push(root);

  for (const [relativePath, content] of Object.entries(structure)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }

  return root;
}

describe("github-pages parser", () => {
  it("derives slug from frontmatter slug", () => {
    expect(
      deriveDesiredSlug({ slug: "Custom-Slug" }, "/tmp/ignored.md")
    ).toBe("custom-slug");
  });

  it("derives slug from permalink", () => {
    expect(deriveSlugFromPermalink("/2024/01/my-post/")).toBe("my-post");
    expect(
      deriveDesiredSlug({ permalink: "/blog/hello-world/" }, "post.md")
    ).toBe("hello-world");
  });

  it("derives slug from filename", () => {
    expect(deriveSlugFromFilename("_posts/2024-01-15-my-post.md")).toBe("my-post");
    expect(deriveSlugFromFilename("hello-world.md")).toBe("hello-world");
  });

  it("parses legacy dates", () => {
    const parsed = new Date("2024-01-15");
    expect(parseLegacyDate("2024-01-15")).toEqual(parsed);
    expect(parseLegacyDate(parsed)).toEqual(parsed);
    expect(parseLegacyDate(null)).toBeNull();
    expect(parseLegacyDate("")).toBeNull();
    expect(parseLegacyDate("invalid")).toBeNull();
  });

  it("derives legacy source status from draft and published flags", () => {
    expect(deriveLegacySourceStatus({ draft: true })).toBe("draft");
    expect(deriveLegacySourceStatus({ draft: "yes" })).toBe("draft");
    expect(deriveLegacySourceStatus({ published: false })).toBe("draft");
    expect(deriveLegacySourceStatus({ published: "no" })).toBe("draft");
    expect(deriveLegacySourceStatus({ published: true })).toBe("published");
    expect(deriveLegacySourceStatus({ published: "1" })).toBe("published");
    expect(deriveLegacySourceStatus({ draft: false })).toBe("published");
    expect(deriveLegacySourceStatus({ draft: 0 })).toBe("published");
    expect(deriveLegacySourceStatus({})).toBe("unknown");
  });

  it("falls back when frontmatter slug or permalink are invalid", () => {
    expect(deriveDesiredSlug({ slug: "!!!" }, "_posts/2024-01-15-fallback.md")).toBe(
      "fallback"
    );
    expect(deriveSlugFromPermalink("/")).toBeNull();
    expect(deriveSlugFromPermalink("/blog/!!!/")).toBeNull();
    expect(deriveSlugFromFilename("My Post Title.md")).toBe("my-post-title");
  });

  it("normalizes tags and categories", () => {
    expect(normalizeTagOrCategoryList(["DevOps", "devops"])).toEqual(["DevOps"]);
    expect(normalizeTagOrCategoryList("news, release")).toEqual(["news", "release"]);
  });

  it("derives old paths from permalink and jekyll filename", () => {
    const paths = deriveOldPaths({
      relativePath: "_posts/2024-01-15-my-post.md",
      permalink: "/legacy/my-post/",
      slug: "my-post",
      publishedAt: new Date("2024-01-15T00:00:00.000Z"),
    });

    expect(paths).toContain("/legacy/my-post");
    expect(paths).toContain("/2024/01/15/my-post");
    expect(paths).toContain("/my-post");
  });

  it("normalizes redirect paths", () => {
    expect(normalizeUrlPath("legacy/my-post/")).toBe("/legacy/my-post");
  });

  it("rejects path traversal outside source root", () => {
    expect(() => resolveSafePath("/tmp/source", "../outside.md")).toThrow(/escapes source root/);
  });

  it("derives old paths from index files and relative paths", () => {
    const indexPaths = deriveOldPaths({
      relativePath: "docs/guide/index.md",
      slug: "guide",
      publishedAt: null,
    });
    expect(indexPaths).toContain("/docs/guide");
    expect(indexPaths).toContain("/docs/guide/index");

    const datedPaths = deriveOldPaths({
      relativePath: "posts/hello.md",
      slug: "hello",
      publishedAt: new Date("2023-06-01T12:00:00.000Z"),
    });
    expect(datedPaths).toContain("/2023/06/01/hello");
  });

  it("parses a legacy markdown file with frontmatter metadata", () => {
    const sourceRoot = createTempSourceTree({
      "_posts/2024-01-15-sample-post.md": `---
title: Sample Post
slug: sample-post
date: 2024-01-15
published: true
tags: [news, release]
categories: Updates
cover: ./images/cover.png
ogImage: ./images/og.png
customField: ignored
excerpt: Short summary
---
Post body here.`,
    });

    const filePath = path.join(sourceRoot, "_posts/2024-01-15-sample-post.md");
    const parsed = parseLegacyMarkdownFile(sourceRoot, filePath);

    expect(parsed.title).toBe("Sample Post");
    expect(parsed.desiredSlug).toBe("sample-post");
    expect(parsed.sourceStatus).toBe("published");
    expect(parsed.publishedAt).toEqual(new Date("2024-01-15"));
    expect(parsed.tags).toEqual(["news", "release"]);
    expect(parsed.categories).toEqual(["Updates"]);
    expect(parsed.coverImageRef).toBe("./images/cover.png");
    expect(parsed.ogImageRef).toBe("./images/og.png");
    expect(parsed.excerpt).toBe("Short summary");
    expect(parsed.contentMarkdown).toBe("Post body here.");
    expect(parsed.unsupportedFrontmatter).toContain("customField");
    expect(parsed.warnings).toHaveLength(0);
    expect(parsed.errors).toHaveLength(0);
  });

  it("warns when published frontmatter lacks a valid date", () => {
    const sourceRoot = createTempSourceTree({
      "draft-post.md": `---
title: Draft Post
published: true
---
Body`,
    });

    const filePath = path.join(sourceRoot, "draft-post.md");
    const parsed = parseLegacyMarkdownFile(sourceRoot, filePath);

    expect(parsed.sourceStatus).toBe("published");
    expect(parsed.publishedAt).toBeNull();
    expect(parsed.warnings).toContain(
      "Frontmatter marks post as published but no valid date was found."
    );
  });

  it("derives title from filename when frontmatter title is missing", () => {
    const sourceRoot = createTempSourceTree({
      "my-cool-post.md": `---
date: 2024-02-01
---
Content`,
    });

    const parsed = parseLegacyMarkdownFile(
      sourceRoot,
      path.join(sourceRoot, "my-cool-post.md")
    );
    expect(parsed.title).toBe("my cool post");
  });

  it("collects markdown files while skipping hidden dirs and node_modules", async () => {
    const sourceRoot = createTempSourceTree({
      "a.md": "# A",
      "nested/b.markdown": "# B",
      ".hidden/secret.md": "# Hidden",
      "node_modules/pkg/readme.md": "# Pkg",
    });

    const files = await collectMarkdownFiles(sourceRoot);
    expect(files.map((file) => path.relative(sourceRoot, file))).toEqual([
      "a.md",
      "nested/b.markdown",
    ]);
  });

  it("reads and parses all legacy markdown files", async () => {
    const sourceRoot = createTempSourceTree({
      "one.md": `---
title: One
slug: one
---
First`,
      "two.md": `---
title: Two
slug: two
---
Second`,
    });

    const parsed = await readLegacyMarkdownFiles(sourceRoot);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((post) => post.desiredSlug).sort()).toEqual(["one", "two"]);
  });
});
