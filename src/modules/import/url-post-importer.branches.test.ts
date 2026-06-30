import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  safeFetchHtmlMock,
  createDraftMock,
  updateDraftMock,
  downloadAndUploadMainImageMock,
  createRedirectMock,
} = vi.hoisted(() => ({
  safeFetchHtmlMock: vi.fn(),
  createDraftMock: vi.fn(),
  updateDraftMock: vi.fn(),
  downloadAndUploadMainImageMock: vi.fn(),
  createRedirectMock: vi.fn(),
}));

vi.mock("@/modules/import/url-fetch", () => ({
  safeFetchHtml: safeFetchHtmlMock,
}));

vi.mock("@/modules/posts/posts.service", () => ({
  createDraft: createDraftMock,
  updateDraft: updateDraftMock,
}));

vi.mock("@/modules/import/url-post-images", () => ({
  downloadAndUploadMainImage: downloadAndUploadMainImageMock,
}));

vi.mock("@/modules/redirects/redirects.service", () => ({
  createRedirect: createRedirectMock,
}));

const parseUrlPostHtmlMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/import/url-post-parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/import/url-post-parser")>();
  return {
    ...actual,
    parseUrlPostHtml: parseUrlPostHtmlMock,
  };
});

import { importPostFromUrl } from "@/modules/import/url-post-importer";

const DEFAULT_PARSED = {
  finalUrl: "https://example.com/2023-06-16-imported-post/",
  sourceHost: "example.com",
  sourcePath: "/2023-06-16-imported-post",
  canonicalUrl: null,
  title: "Imported Title",
  excerpt: "Summary",
  slug: "2023-06-16-imported-post",
  contentHtml: "<p>Body</p>",
  contentMarkdown: "Article body content.",
  mainImageUrl: null as string | null,
  warnings: [] as string[],
};

const SAMPLE_HTML = `<!DOCTYPE html><html><body><article>
<h1>Imported Title</h1>
<p>${"Article body content. ".repeat(10)}</p>
</article></body></html>`;

describe("url post importer branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://example.com";
    safeFetchHtmlMock.mockResolvedValue({
      finalUrl: "https://example.com/2023-06-16-imported-post/",
      contentType: "text/html",
      body: Buffer.from(SAMPLE_HTML),
    });
    parseUrlPostHtmlMock.mockReturnValue({ ...DEFAULT_PARSED });
    createDraftMock.mockResolvedValue({
      id: "post-1",
      slug: "2023-06-16-imported-post",
      status: "draft",
    });
    updateDraftMock.mockResolvedValue({ id: "post-1", slug: "2023-06-16-imported-post" });
    createRedirectMock.mockResolvedValue({});
  });

  it("updates SEO metadata when no main image is found", async () => {
    const result = await importPostFromUrl({
      url: "https://example.com/2023-06-16-imported-post/",
      createRedirect: false,
      userId: "admin-1",
    });

    expect(result.report.mainImageImported).toBe(false);
    expect(updateDraftMock).toHaveBeenCalled();
  });

  it("creates redirects for same-domain imports", async () => {
    const result = await importPostFromUrl({
      url: "https://example.com/2023-06-16-imported-post/",
      createRedirect: true,
      userId: "admin-1",
    });

    expect(result.report.redirectCreated).toBe(true);
    expect(createRedirectMock).toHaveBeenCalled();
  });

  it("warns when redirect domain does not match app base URL", async () => {
    parseUrlPostHtmlMock.mockReturnValueOnce({
      ...DEFAULT_PARSED,
      finalUrl: "https://other-site.com/post/",
      sourcePath: "/post",
    });

    const result = await importPostFromUrl({
      url: "https://other-site.com/post/",
      createRedirect: true,
      userId: "admin-1",
    });

    expect(result.report.redirectCreated).toBe(false);
    expect(result.report.warnings.some((warning) => warning.includes("domain"))).toBe(true);
  });

  it("warns when redirect creation fails", async () => {
    createRedirectMock.mockRejectedValue(new Error("duplicate"));

    const result = await importPostFromUrl({
      url: "https://example.com/2023-06-16-imported-post/",
      createRedirect: true,
      userId: "admin-1",
    });

    expect(result.report.redirectCreated).toBe(false);
    expect(result.report.warnings.some((warning) => warning.includes("Redirect was not created"))).toBe(
      true
    );
  });

  it("rejects imports without a title", async () => {
    parseUrlPostHtmlMock.mockReturnValueOnce({ ...DEFAULT_PARSED, title: "   " });

    await expect(
      importPostFromUrl({
        url: "https://example.com/post/",
        createRedirect: false,
        userId: "admin-1",
      })
    ).rejects.toThrow(/title/i);
  });

  it("rejects imports without article content", async () => {
    parseUrlPostHtmlMock.mockReturnValueOnce({ ...DEFAULT_PARSED, contentMarkdown: "   " });

    await expect(
      importPostFromUrl({
        url: "https://example.com/post/",
        createRedirect: false,
        userId: "admin-1",
      })
    ).rejects.toThrow(/content/i);
  });

  it("warns when slug conflicts during draft creation", async () => {
    createDraftMock.mockResolvedValueOnce({
      id: "post-1",
      slug: "2023-06-16-imported-post-2",
      status: "draft",
    });

    const result = await importPostFromUrl({
      url: "https://example.com/2023-06-16-imported-post/",
      createRedirect: false,
      userId: "admin-1",
    });

    expect(result.report.warnings.some((warning) => warning.includes("already exists"))).toBe(true);
  });

  it("imports main images and rewrites markdown", async () => {
    parseUrlPostHtmlMock.mockReturnValueOnce({
      ...DEFAULT_PARSED,
      mainImageUrl: "https://example.com/hero.png",
      contentMarkdown: "![hero](https://example.com/hero.png)\n\nBody",
    });
    downloadAndUploadMainImageMock.mockResolvedValueOnce({
      assetId: "asset-1",
      publicUrl: "/api/assets/posts/post-1/hero.png",
    });

    const result = await importPostFromUrl({
      url: "https://example.com/post/",
      createRedirect: false,
      userId: "admin-1",
    });

    expect(result.report.mainImageImported).toBe(true);
    expect(downloadAndUploadMainImageMock).toHaveBeenCalled();
    expect(updateDraftMock).toHaveBeenCalledWith(
      "post-1",
      expect.objectContaining({
        coverAssetId: "asset-1",
        ogAssetId: "asset-1",
      }),
      "admin-1"
    );
  });

  it("continues when main image import fails", async () => {
    parseUrlPostHtmlMock.mockReturnValueOnce({
      ...DEFAULT_PARSED,
      mainImageUrl: "https://example.com/hero.png",
    });
    downloadAndUploadMainImageMock.mockRejectedValueOnce(new Error("download failed"));

    const result = await importPostFromUrl({
      url: "https://example.com/post/",
      createRedirect: false,
      userId: "admin-1",
    });

    expect(result.report.mainImageImported).toBe(false);
    expect(result.report.warnings.some((warning) => warning.includes("download failed"))).toBe(true);
  });

  it("handles non-error main image failures", async () => {
    parseUrlPostHtmlMock.mockReturnValueOnce({
      ...DEFAULT_PARSED,
      mainImageUrl: "https://example.com/hero.png",
    });
    downloadAndUploadMainImageMock.mockRejectedValueOnce("broken");

    const result = await importPostFromUrl({
      url: "https://example.com/post/",
      createRedirect: false,
      userId: "admin-1",
    });

    expect(result.report.warnings).toContain("Main image could not be imported");
  });

  it("skips redirects when app base URL is missing", async () => {
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;

    const result = await importPostFromUrl({
      url: "https://example.com/post/",
      createRedirect: true,
      userId: "admin-1",
    });

    expect(result.report.redirectCreated).toBe(false);
    expect(createRedirectMock).not.toHaveBeenCalled();
  });

  it("maps non-error redirect failures to warnings", async () => {
    createRedirectMock.mockRejectedValueOnce("nope");

    const result = await importPostFromUrl({
      url: "https://example.com/2023-06-16-imported-post/",
      createRedirect: true,
      userId: "admin-1",
    });

    expect(result.report.warnings).toContain("Redirect was not created");
  });
});
