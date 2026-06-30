import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, fromMock, whereMock, limitMock } = vi.hoisted(() => {
  const limitMock = vi.fn();
  const whereMock = vi.fn();
  const fromMock = vi.fn();
  const selectMock = vi.fn();

  return { selectMock, fromMock, whereMock, limitMock };
});

vi.mock("@/db/get-db", () => ({
  db: { select: selectMock },
}));

vi.mock("@/lib/env", () => ({
  readEnv: vi.fn((key: string) => {
    if (key === "APP_NAME") return "Env Blog";
    if (key === "APP_BASE_URL") return "https://env.example.com";
    if (key === "NEXTAUTH_URL") return "https://auth.example.com";
    return undefined;
  }),
}));

import { getBlogConfig, getBlogSetting } from "@/modules/public/blog-config";

describe("blog config", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    limitMock.mockResolvedValue([]);
    whereMock.mockReturnValue({ limit: limitMock });
    fromMock.mockReturnValue({ where: whereMock });
    selectMock.mockReturnValue({ from: fromMock });
  });

  it("getBlogConfig merges db settings with env and defaults", async () => {
    fromMock.mockResolvedValueOnce([
      { key: "blogTitle", value: "DB Title" },
      { key: "blogDescription", value: "DB Description" },
      { key: "baseUrl", value: "https://db.example.com" },
      { key: "postsPerPage", value: "24" },
      { key: "rssEnabled", value: "false" },
      { key: "analyticsEnabled", value: "false" },
      { key: "defaultSeoImage", value: "/seo.png" },
    ]);

    await expect(getBlogConfig()).resolves.toEqual({
      title: "DB Title",
      description: "DB Description",
      baseUrl: "https://db.example.com",
      postsPerPage: 24,
      rssEnabled: false,
      analyticsEnabled: false,
      defaultSeoImage: "/seo.png",
    });
  });

  it("getBlogConfig falls back to env and defaults when db is empty", async () => {
    fromMock.mockResolvedValueOnce([]);

    await expect(getBlogConfig()).resolves.toEqual({
      title: "Env Blog",
      description: "Markdown-based blog publishing platform",
      baseUrl: "https://env.example.com",
      postsPerPage: 12,
      rssEnabled: true,
      analyticsEnabled: true,
      defaultSeoImage: null,
    });
  });

  it("getBlogSetting returns a single setting value", async () => {
    limitMock.mockResolvedValueOnce([{ key: "blogTitle", value: "Single Title" }]);

    await expect(getBlogSetting("blogTitle")).resolves.toBe("Single Title");
    expect(whereMock).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(1);
  });

  it("getBlogSetting returns undefined when key is missing", async () => {
    limitMock.mockResolvedValueOnce([]);

    await expect(getBlogSetting("missing")).resolves.toBeUndefined();
  });
});
