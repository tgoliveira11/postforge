import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  extractMarkdownImageReferences,
  localImageExists,
  resolveCoverImagePath,
  resolveLocalImagePath,
  rewriteMarkdownImageReference,
  rewriteMarkdownImages,
} from "./github-pages-images";
import { isSafeRelativeImagePath } from "./github-pages.validation";

const tempPaths: string[] = [];

afterEach(() => {
  for (const tempPath of tempPaths.splice(0)) {
    fs.rmSync(tempPath, { recursive: true, force: true });
  }
});

function createTempImageTree(structure: Record<string, string | Buffer>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "postforge-images-"));
  tempPaths.push(root);

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

describe("github-pages images", () => {
  it("detects local and remote markdown images", () => {
    const markdown = "![local](./images/a.png)\n![remote](https://cdn.example.com/b.png)";
    const refs = extractMarkdownImageReferences(markdown);
    expect(refs).toHaveLength(2);
    expect(refs[0]?.isRemote).toBe(false);
    expect(refs[1]?.isRemote).toBe(true);
  });

  it("preserves remote images and rewrites copied local images", () => {
    const markdown = "![local](./images/a.png)";
    const rewritten = rewriteMarkdownImages(markdown, new Map([["./images/a.png", "/api/assets/posts/x/a.png"]]));
    expect(rewritten).toContain("/api/assets/posts/x/a.png");
  });

  it("rejects unsafe relative image paths", () => {
    expect(isSafeRelativeImagePath("../secret.png")).toBe(false);
    expect(isSafeRelativeImagePath("./images/ok.png")).toBe(true);
    expect(isSafeRelativeImagePath("https://example.com/a.png")).toBe(false);
    expect(isSafeRelativeImagePath("data:image/png;base64,abc")).toBe(false);
    expect(isSafeRelativeImagePath("")).toBe(false);
  });

  it("extracts markdown images with optional titles", () => {
    const markdown = '![alt text](./local.png "title here")';
    const refs = extractMarkdownImageReferences(markdown);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      alt: "alt text",
      url: "./local.png",
      isRemote: false,
    });
  });

  it("resolves local image paths relative to markdown and source roots", () => {
    const sourceRoot = createTempImageTree({
      "posts/images/shared.png": Buffer.from("png"),
      "posts/article.md": "# Post",
    });

    const markdownFile = path.join(sourceRoot, "posts/article.md");

    const besideMarkdown = resolveLocalImagePath({
      markdownFilePath: markdownFile,
      imageRef: "./images/shared.png",
      sourceRoot,
    });
    expect(besideMarkdown).toBe(path.join(sourceRoot, "posts/images/shared.png"));

    const absoluteFromSource = resolveLocalImagePath({
      markdownFilePath: markdownFile,
      imageRef: "/posts/images/shared.png",
      sourceRoot,
    });
    expect(absoluteFromSource).toBe(path.join(sourceRoot, "posts/images/shared.png"));
  });

  it("returns null for unsafe local image paths", () => {
    const sourceRoot = createTempImageTree({
      "post.md": "# Post",
    });

    expect(
      resolveLocalImagePath({
        markdownFilePath: path.join(sourceRoot, "post.md"),
        imageRef: "../outside.png",
        sourceRoot,
      })
    ).toBeNull();
  });

  it("checks whether a local image file exists", async () => {
    const sourceRoot = createTempImageTree({
      "images/real.png": Buffer.from("png"),
    });
    const realPath = path.join(sourceRoot, "images/real.png");

    await expect(localImageExists(realPath)).resolves.toBe(true);
    await expect(localImageExists(null)).resolves.toBe(false);
    await expect(localImageExists(path.join(sourceRoot, "missing.png"))).resolves.toBe(false);
  });

  it("rewrites a single markdown image reference", () => {
    const markdown = "![cover](./images/a.png)";
    const rewritten = rewriteMarkdownImageReference(
      markdown,
      "./images/a.png",
      "/api/assets/posts/x/a.png"
    );
    expect(rewritten).toBe("![cover](/api/assets/posts/x/a.png)");
  });

  it("returns null for remote cover image refs", () => {
    expect(
      resolveCoverImagePath({
        coverImageRef: "https://cdn.example.com/cover.png",
        markdownFilePath: "/tmp/post.md",
        sourceRoot: "/tmp",
      })
    ).toBeNull();
  });

  it("resolves cover images through local path resolution", () => {
    const sourceRoot = createTempImageTree({
      "post.md": "# Post",
      "cover.png": Buffer.from("png"),
    });

    const coverPath = resolveCoverImagePath({
      coverImageRef: "./cover.png",
      markdownFilePath: path.join(sourceRoot, "post.md"),
      sourceRoot,
    });

    expect(coverPath).toBe(path.join(sourceRoot, "cover.png"));
  });
});
