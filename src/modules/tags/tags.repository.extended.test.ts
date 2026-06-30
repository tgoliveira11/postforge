import { beforeEach, describe, expect, it, vi } from "vitest";

function createChain(result: unknown, terminal: "limit" | "orderBy" | "where" | "groupBy" = "limit") {
  const terminalMock = vi.fn().mockResolvedValue(result);
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => chain;
  for (const method of ["from", "where", "orderBy", "groupBy", "innerJoin", "leftJoin", "limit", "offset"]) {
    chain[method] = vi.fn(self);
  }
  chain[terminal] = terminalMock;
  return chain;
}

const selectMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const setMock = vi.hoisted(() => vi.fn());
const returningMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/get-db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

import {
  findTagByNameCaseInsensitive,
  listAdminTags,
  searchTagsByName,
  updateTagById,
} from "@/modules/tags/tags.repository";

const sampleTag = {
  id: "tag-1",
  name: "TypeScript",
  slug: "typescript",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("tags repository extended", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returningMock.mockResolvedValue([sampleTag]);
    setMock.mockReturnValue({ where: vi.fn(() => ({ returning: returningMock })) });
    updateMock.mockReturnValue({ set: setMock });
  });

  it("updateTagById returns updated row", async () => {
    await expect(updateTagById("tag-1", { name: "TS" })).resolves.toEqual(sampleTag);
  });

  it("findTagByNameCaseInsensitive returns a tag", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([sampleTag], "limit")),
    });

    await expect(findTagByNameCaseInsensitive("TypeScript")).resolves.toEqual(sampleTag);
  });

  it("searchTagsByName returns empty for blank query", async () => {
    await expect(searchTagsByName("   ")).resolves.toEqual([]);
  });

  it("searchTagsByName returns matches", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => createChain([sampleTag], "limit")),
    });

    await expect(searchTagsByName("type")).resolves.toEqual([sampleTag]);
  });

  it("listAdminTags maps numeric counts", async () => {
    selectMock.mockReturnValueOnce({
      from: vi.fn(() =>
        createChain([{ ...sampleTag, totalPostCount: "4", publishedPostCount: "1" }], "orderBy")
      ),
    });

    const rows = await listAdminTags();

    expect(rows[0]?.totalPostCount).toBe(4);
    expect(rows[0]?.publishedPostCount).toBe(1);
  });
});
