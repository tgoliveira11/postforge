import { describe, expect, it } from "vitest";
import { createCategorySchema, updateCategorySchema } from "@/modules/categories/categories.validation";
import { createTagSchema, updateTagSchema } from "@/modules/tags/tags.validation";

describe("taxonomy validation schemas", () => {
  it("createCategorySchema accepts optional slug and description", () => {
    expect(
      createCategorySchema.parse({
        name: "Engineering",
        slug: "engineering",
        description: "Tech posts",
      })
    ).toMatchObject({ name: "Engineering", slug: "engineering" });
  });

  it("updateCategorySchema accepts nullable description", () => {
    expect(updateCategorySchema.parse({ description: null })).toEqual({ description: null });
  });

  it("createTagSchema accepts optional slug", () => {
    expect(createTagSchema.parse({ name: "TypeScript", slug: "typescript" })).toMatchObject({
      name: "TypeScript",
      slug: "typescript",
    });
  });

  it("updateTagSchema accepts partial updates", () => {
    expect(updateTagSchema.parse({ slug: "ts" })).toEqual({ slug: "ts" });
  });
});
