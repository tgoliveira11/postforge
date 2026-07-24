import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("public header navigation layout", () => {
  it("keeps search as a normal nav link and avoids inline header search", () => {
    const header = readSource("src/components/public/site-header.tsx");
    const nav = readSource("src/components/public/site-nav.tsx");

    expect(header).not.toContain("SearchForm");
    expect(nav).toContain('href: "/search"');
  });

  it("uses horizontal overflow instead of wrapping cramped links", () => {
    const header = readSource("src/components/public/site-header.tsx");
    const nav = readSource("src/components/public/site-nav.tsx");

    expect(header).toContain("overflow-x-auto");
    expect(nav).toContain("flex-nowrap");
    expect(nav).toContain("whitespace-nowrap");
  });
});
