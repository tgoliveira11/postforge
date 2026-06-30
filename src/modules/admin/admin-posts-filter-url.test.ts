import { describe, expect, it } from "vitest";
import {
  buildAdminPostsFilterUrl,
  filterTagsByQuery,
  getTagFilterOptions,
} from "@/modules/admin/admin-posts-filter-url";
import type { Tag } from "@/modules/tags/tags.types";

const tags: Tag[] = [
  {
    id: "tag-1",
    name: "Architecture",
    slug: "architecture",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tag-2",
    name: "DevOps",
    slug: "devops",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "tag-3",
    name: "Design Systems",
    slug: "design-systems",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("admin posts filter url helpers", () => {
  it("filters tags by typed query", () => {
    expect(filterTagsByQuery(tags, "dev")).toEqual([tags[1]]);
    expect(filterTagsByQuery(tags, "design")).toEqual([tags[2]]);
  });

  it("returns all tags when showAllTags is true", () => {
    expect(getTagFilterOptions(tags, "dev", true).map((tag) => tag.name)).toEqual([
      "Architecture",
      "Design Systems",
      "DevOps",
    ]);
  });

  it("places All tags first in combobox options via buildOptions helper", () => {
    const options = [{ type: "all" as const }, ...getTagFilterOptions(tags, "", true).map((tag) => ({ type: "tag" as const, tag }))];
    expect(options[0]).toEqual({ type: "all" });
  });

  it("builds tag filter url preserving other params", () => {
    expect(
      buildAdminPostsFilterUrl(
        {
          status: "published",
          categoryId: "cat-1",
          search: "hello",
          sort: "title",
          direction: "asc",
        },
        { tagId: "tag-2" }
      )
    ).toBe(
      "/admin/posts?status=published&categoryId=cat-1&search=hello&sort=title&direction=asc&tagId=tag-2"
    );
  });

  it("removes tagId when selecting all tags", () => {
    expect(
      buildAdminPostsFilterUrl(
        {
          status: "draft",
          tagId: "tag-1",
          sort: "publicOrder",
          direction: "desc",
        },
        { tagId: null }
      )
    ).toBe("/admin/posts?status=draft&sort=publicOrder&direction=desc");
  });

  it("returns no tag matches for unknown query", () => {
    expect(filterTagsByQuery(tags, "missing")).toEqual([]);
  });

  it("returns all tags for an empty query", () => {
    expect(filterTagsByQuery(tags, "   ")).toEqual(tags);
  });

  it("filters tags when showAllTags is false and query is present", () => {
    expect(getTagFilterOptions(tags, "dev", false).map((tag) => tag.name)).toEqual(["DevOps"]);
  });

  it("builds base admin posts url when no filters are set", () => {
    expect(buildAdminPostsFilterUrl({}, { tagId: null })).toBe("/admin/posts");
  });
});
