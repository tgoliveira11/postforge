import { describe, expect, it } from "vitest";
import { generateDatedSlugFromTitle, normalizeSlug } from "@/modules/posts/slug";

describe("generateDatedSlugFromTitle", () => {
  const fixedDate = new Date("2026-06-16T12:00:00.000Z");

  it("prefixes the current date and slugifies the title", () => {
    expect(generateDatedSlugFromTitle("Hello World", fixedDate)).toBe("2026-06-16-hello-world");
  });

  it("removes accents and lowercases", () => {
    expect(generateDatedSlugFromTitle("Café naïve Résumé", fixedDate)).toBe("2026-06-16-cafe-naive-resume");
  });

  it("replaces spaces with hyphens and collapses repeated hyphens", () => {
    expect(generateDatedSlugFromTitle("Post   With---Hyphens", fixedDate)).toBe(
      "2026-06-16-post-with-hyphens"
    );
  });

  it("keeps generated slugs within the max length", () => {
    const longTitle =
      "Deciphering the Differences - Software Architecture, Solution Architecture and System Architecture";
    const slug = generateDatedSlugFromTitle(longTitle, fixedDate);
    expect(slug.startsWith("2026-06-16-")).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(normalizeSlug(slug)).toBe(slug);
  });

  it("falls back to post when title slugifies to empty", () => {
    expect(generateDatedSlugFromTitle("!!!", fixedDate)).toBe("2026-06-16-post");
  });
});
