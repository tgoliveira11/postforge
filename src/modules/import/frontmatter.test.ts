import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseFrontmatter, readFrontmatterFile } from "./frontmatter";

const tempFiles: string[] = [];

afterEach(() => {
  for (const filePath of tempFiles.splice(0)) {
    fs.rmSync(filePath, { force: true });
  }
});

function writeTempFile(name: string, content: string): string {
  const filePath = path.join(os.tmpdir(), `postforge-frontmatter-${name}-${Date.now()}.md`);
  fs.writeFileSync(filePath, content, "utf8");
  tempFiles.push(filePath);
  return filePath;
}

describe("frontmatter", () => {
  it("parses yaml frontmatter and body content", () => {
    const parsed = parseFrontmatter(`---
title: Hello
tags: [news, release]
---
Body content here.`);

    expect(parsed.data).toEqual({
      title: "Hello",
      tags: ["news", "release"],
    });
    expect(parsed.content).toBe("Body content here.");
  });

  it("returns the full file when frontmatter is missing", () => {
    const parsed = parseFrontmatter("No frontmatter here.");
    expect(parsed.data).toEqual({});
    expect(parsed.content).toBe("No frontmatter here.");
  });

  it("extracts excerpt when excerpt_separator is present", () => {
    const parsed = parseFrontmatter(`---
title: Post
excerpt_separator: <!--more-->
---
Intro paragraph.
<!--more-->
Rest of the post.`);

    expect(parsed.excerpt).toBe("Intro paragraph.\n");
    expect(parsed.content).toContain("Rest of the post.");
  });

  it("reads frontmatter from disk", () => {
    const filePath = writeTempFile(
      "read",
      `---
slug: from-disk
---
Markdown body.`
    );

    const parsed = readFrontmatterFile(filePath);
    expect(parsed.path).toBe(filePath);
    expect(parsed.data.slug).toBe("from-disk");
    expect(parsed.content).toBe("Markdown body.");
  });

  it("handles malformed or incomplete frontmatter blocks", () => {
    expect(parseFrontmatter("----\ntitle: Broken")).toEqual({
      data: {},
      content: "----\ntitle: Broken",
    });

    expect(parseFrontmatter("---\ntitle: Missing close")).toEqual({
      data: {},
      content: "---\ntitle: Missing close",
    });
  });

  it("strips leading carriage returns and newlines from body content", () => {
    const parsed = parseFrontmatter(`---
title: Post
---
\r\n\r\nActual body.`);

    expect(parsed.content).toBe("Actual body.");
  });

  it("ignores non-object yaml frontmatter values", () => {
    const parsed = parseFrontmatter(`---
- just
- a
- list
---
Body.`);

    expect(parsed.data).toEqual({});
    expect(parsed.content).toBe("Body.");
  });
});
