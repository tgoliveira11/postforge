import { describe, expect, it } from "vitest";
import {
  adminSortIndicator,
  buildAdminPostsSortHref,
  parseAdminPostsSortInput,
} from "@/modules/posts/admin-posts-sort";

describe("admin posts sort helpers", () => {
  it("uses default sort when query params are missing", () => {
    expect(parseAdminPostsSortInput({})).toEqual({ usesDefaultSort: true });
  });

  it("parses sort and direction from query params", () => {
    expect(parseAdminPostsSortInput({ sort: "title", direction: "desc" })).toEqual({
      sort: "title",
      direction: "desc",
      usesDefaultSort: false,
    });
  });

  it("defaults direction to asc for invalid values", () => {
    expect(parseAdminPostsSortInput({ sort: "status", direction: "sideways" })).toEqual({
      sort: "status",
      direction: "asc",
      usesDefaultSort: false,
    });
  });

  it("builds sort href toggling direction for the active column", () => {
    expect(
      buildAdminPostsSortHref({
        column: "title",
        currentSort: "title",
        currentDirection: "asc",
        filters: { status: "published", search: "hello" },
      })
    ).toBe("/admin/posts?status=published&search=hello&sort=title&direction=desc");
  });

  it("does not treat direction-only query params as explicit sort", () => {
    expect(parseAdminPostsSortInput({ direction: "desc" })).toEqual({ usesDefaultSort: true });
  });

  it("treats publicOrder query param as explicit sort", () => {
    expect(parseAdminPostsSortInput({ sort: "publicOrder", direction: "asc" })).toEqual({
      sort: "publicOrder",
      direction: "asc",
      usesDefaultSort: false,
    });
  });

  it("shows default indicator on public order when using default sort", () => {
    expect(
      adminSortIndicator({
        column: "publicOrder",
        usesDefaultSort: true,
      })
    ).toBe("default");
  });

  it("returns null for inactive columns and direction for active ones", () => {
    expect(
      adminSortIndicator({
        column: "title",
        currentSort: "status",
        currentDirection: "desc",
        usesDefaultSort: false,
      })
    ).toBeNull();

    expect(
      adminSortIndicator({
        column: "title",
        currentSort: "title",
        currentDirection: "desc",
        usesDefaultSort: false,
      })
    ).toBe("desc");

    expect(
      adminSortIndicator({
        column: "title",
        currentSort: "title",
        usesDefaultSort: false,
      })
    ).toBe("asc");
  });

  it("builds href without query string when filters are empty", () => {
    expect(
      buildAdminPostsSortHref({
        column: "title",
        filters: {},
      })
    ).toBe("/admin/posts?sort=title&direction=asc");
  });
});
