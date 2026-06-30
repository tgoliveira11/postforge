import { describe, expect, it } from "vitest";
import {
  buildAdminPostOrderBy,
  compareDefaultAdminPostOrder,
  DEFAULT_ADMIN_POST_ORDER,
  getAdminPostsDefaultOrderBy,
  sortPostsByDefaultAdminOrder,
  type AdminDefaultSortPost,
} from "@/modules/posts/posts.repository.admin-sort";

function makePost(overrides: Partial<AdminDefaultSortPost> & { id: string }): AdminDefaultSortPost & {
  id: string;
} {
  return {
    publicOrder: 0,
    publishedAt: null,
    updatedAt: new Date("2026-06-16T00:00:00Z"),
    ...overrides,
  };
}

describe("admin post order by", () => {
  it("uses default admin sort when no sort is provided", () => {
    expect(buildAdminPostOrderBy({})).toEqual(DEFAULT_ADMIN_POST_ORDER);
    expect(getAdminPostsDefaultOrderBy()).toHaveLength(3);
  });

  it("explicit sort overrides default admin ordering", () => {
    const clauses = buildAdminPostOrderBy({ sort: "title", direction: "asc" });
    expect(clauses).not.toEqual(DEFAULT_ADMIN_POST_ORDER);
  });

  it("supports all explicit admin sort columns", () => {
    expect(buildAdminPostOrderBy({ sort: "status", direction: "desc" })).toHaveLength(2);
    expect(buildAdminPostOrderBy({ sort: "published", direction: "asc" })).toHaveLength(2);
    expect(buildAdminPostOrderBy({ sort: "scheduled", direction: "desc" })).toHaveLength(2);
    expect(buildAdminPostOrderBy({ sort: "updated", direction: "asc" })).toHaveLength(1);
    expect(buildAdminPostOrderBy({ sort: "publicOrder", direction: "desc" })).toHaveLength(3);
    expect(buildAdminPostOrderBy({ sort: "flags", direction: "asc" })).toHaveLength(4);
    expect(buildAdminPostOrderBy({ sort: "category", direction: "desc" })).toHaveLength(2);
    expect(buildAdminPostOrderBy({ sort: "unknown" as "title" })).toEqual(DEFAULT_ADMIN_POST_ORDER);
  });
});

describe("default admin post ordering rules", () => {
  const postA = makePost({
    id: "A",
    publishedAt: new Date("2026-06-16T10:00:00Z"),
    updatedAt: new Date("2026-06-16T10:30:00Z"),
  });
  const postB = makePost({
    id: "B",
    updatedAt: new Date("2026-06-16T12:00:00Z"),
  });
  const postC = makePost({
    id: "C",
    publicOrder: 1,
    publishedAt: new Date("2026-06-16T11:00:00Z"),
    updatedAt: new Date("2026-06-16T11:00:00Z"),
  });
  const postD = makePost({
    id: "D",
    publicOrder: 2,
    publishedAt: new Date("2026-06-16T13:00:00Z"),
    updatedAt: new Date("2026-06-16T13:00:00Z"),
  });
  const postE = makePost({
    id: "E",
    publishedAt: new Date("2026-06-17T01:00:00Z"),
    updatedAt: new Date("2026-06-17T01:00:00Z"),
  });

  it("sorts by publicOrder ASC before date", () => {
    expect(compareDefaultAdminPostOrder(postA, postC)).toBeLessThan(0);
    expect(compareDefaultAdminPostOrder(postC, postD)).toBeLessThan(0);
  });

  it("sorts within the same publicOrder by COALESCE(publishedAt, updatedAt) DESC", () => {
    expect(compareDefaultAdminPostOrder(postB, postA)).toBeLessThan(0);
    expect(compareDefaultAdminPostOrder(postE, postA)).toBeLessThan(0);
  });

  it("uses updatedAt as the final tiebreaker", () => {
    const left = makePost({
      id: "left",
      publicOrder: 0,
      publishedAt: new Date("2026-06-16T10:00:00Z"),
      updatedAt: new Date("2026-06-16T10:00:00Z"),
    });
    const right = makePost({
      id: "right",
      publicOrder: 0,
      publishedAt: new Date("2026-06-16T10:00:00Z"),
      updatedAt: new Date("2026-06-16T11:00:00Z"),
    });

    expect(compareDefaultAdminPostOrder(left, right)).toBeGreaterThan(0);
  });

  it("orders the documented example set as E, B, A, C, D", () => {
    const ordered = sortPostsByDefaultAdminOrder([postD, postB, postA, postE, postC]);
    expect(ordered.map((post) => post.id)).toEqual(["E", "B", "A", "C", "D"]);
  });
});
