import { describe, expect, it } from "vitest";
import { defaultSchema } from "rehype-sanitize";
import { getMarkdownSanitizeSchema, sanitizeSchema } from "./markdown-sanitizer";

describe("markdown sanitizer", () => {
  it("exports the default rehype-sanitize schema", () => {
    expect(sanitizeSchema).toBe(defaultSchema);
  });

  it("returns the shared sanitize schema", () => {
    expect(getMarkdownSanitizeSchema()).toBe(sanitizeSchema);
    expect(getMarkdownSanitizeSchema().tagNames).toBeDefined();
  });
});
