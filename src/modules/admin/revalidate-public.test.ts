import { describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { revalidatePublicPaths } from "@/modules/admin/revalidate-public";

describe("revalidatePublicPaths", () => {
  it("revalidates core public routes", () => {
    revalidatePathMock.mockClear();
    revalidatePublicPaths();

    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/blog");
    expect(revalidatePathMock).toHaveBeenCalledWith("/tags");
    expect(revalidatePathMock).toHaveBeenCalledWith("/categories");
    expect(revalidatePathMock).toHaveBeenCalledWith("/search");
    expect(revalidatePathMock).toHaveBeenCalledWith("/rss.xml");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemap.xml");
  });

  it("revalidates a specific post path when slug is provided", () => {
    revalidatePathMock.mockClear();

    revalidatePublicPaths("hello-world");

    expect(revalidatePathMock).toHaveBeenCalledWith("/blog/hello-world");
  });
});
