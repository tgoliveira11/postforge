import { describe, expect, it, vi } from "vitest";
import {
  assertSafeImportUrl,
  safeFetchBinary,
  safeFetchHtml,
  UrlFetchSecurityError,
} from "@/modules/import/url-fetch";

describe("url fetch additional branches", () => {
  it("rejects invalid URLs and unsupported protocols", () => {
    expect(() => assertSafeImportUrl("not-a-url")).toThrow(UrlFetchSecurityError);
    expect(() => assertSafeImportUrl("ftp://example.com/file")).toThrow(/http and https/i);
  });

  it("rejects localhost subdomains and metadata hosts", () => {
    expect(() => assertSafeImportUrl("http://app.localhost/post")).toThrow(UrlFetchSecurityError);
    expect(() => assertSafeImportUrl("http://metadata.google.internal/post")).toThrow(
      UrlFetchSecurityError
    );
  });

  it("rejects IPv6 loopback and link-local addresses", () => {
    expect(() => assertSafeImportUrl("http://[fe80::1%25en0]/post")).toThrow(UrlFetchSecurityError);
  });

  it("rejects malformed IPv4 octets", () => {
    expect(() => assertSafeImportUrl("http://999.999.999.999/post")).toThrow(UrlFetchSecurityError);
  });

  it("follows redirects and returns the final response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "/final" },
        })
      )
      .mockResolvedValueOnce(
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        })
      );

    const result = await safeFetchBinary({
      url: "https://example.com/start",
      fetchImpl,
    });

    expect(result.finalUrl).toBe("https://example.com/final");
    expect(result.contentType).toContain("text/html");
  });

  it("rejects too many redirects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "/loop" },
      })
    );

    await expect(
      safeFetchBinary({
        url: "https://example.com/start",
        fetchImpl,
        maxRedirects: 1,
      })
    ).rejects.toThrow(/redirects/i);
  });

  it("rejects non-ok HTTP responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));

    await expect(
      safeFetchBinary({
        url: "https://example.com/missing",
        fetchImpl,
      })
    ).rejects.toThrow(/HTTP 404/i);
  });

  it("rejects unexpected content types", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("data", {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(
      safeFetchBinary({
        url: "https://example.com/data.json",
        fetchImpl,
        allowedContentTypes: /text\/html/i,
      })
    ).rejects.toThrow(/content type/i);
  });

  it("handles fetch abort timeouts", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));

    await expect(
      safeFetchBinary({
        url: "https://example.com/slow",
        fetchImpl,
        timeoutMs: 10,
      })
    ).rejects.toThrow(/timed out/i);
  });

  it("handles generic fetch failures", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      safeFetchBinary({
        url: "https://example.com/fail",
        fetchImpl,
      })
    ).rejects.toThrow(/could not fetch/i);
  });

  it("returns empty body when response has no body stream", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "content-type": "text/plain" },
      })
    );

    const result = await safeFetchBinary({
      url: "https://example.com/empty",
      fetchImpl,
    });

    expect(result.body).toEqual(Buffer.from([]));
  });

  it("wraps safeFetchHtml with html content type rules", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "application/xhtml+xml" },
      })
    );

    const result = await safeFetchHtml({
      url: "https://example.com/page",
      fetchImpl,
    });

    expect(result.contentType).toContain("application/xhtml+xml");
  });

  it("rejects credentials embedded in URLs", () => {
    expect(() => assertSafeImportUrl("https://user:pass@example.com/post")).toThrow(
      UrlFetchSecurityError
    );
  });

  it("rejects IPv6 loopback addresses", () => {
    expect(() => assertSafeImportUrl("http://127.0.0.1/post")).toThrow(UrlFetchSecurityError);
  });

  it("rejects private IPv4 ranges", () => {
    expect(() => assertSafeImportUrl("http://10.0.0.1/post")).toThrow(UrlFetchSecurityError);
    expect(() => assertSafeImportUrl("http://192.168.1.1/post")).toThrow(UrlFetchSecurityError);
    expect(() => assertSafeImportUrl("http://169.254.0.1/post")).toThrow(UrlFetchSecurityError);
    expect(() => assertSafeImportUrl("http://172.20.0.1/post")).toThrow(UrlFetchSecurityError);
  });

  it("rejects redirect responses without a location header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));

    await expect(
      safeFetchBinary({
        url: "https://example.com/start",
        fetchImpl,
      })
    ).rejects.toThrow(/redirects/i);
  });

  it("rejects responses that exceed the max byte limit", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      },
    });

    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "content-type": "text/plain" },
      })
    );

    await expect(
      safeFetchBinary({
        url: "https://example.com/large",
        fetchImpl,
        maxBytes: 2,
      })
    ).rejects.toThrow(/maximum allowed size/i);
  });

  it("uses default content type when header is missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name === "content-type" ? null : null),
      },
      body: null,
    });

    const result = await safeFetchBinary({
      url: "https://example.com/plain",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.contentType).toBe("application/octet-stream");
  });

  it("rejects link-local IPv6 prefixes", () => {
    expect(() => assertSafeImportUrl("http://fe80::1/post")).toThrow(UrlFetchSecurityError);
  });

  it("rejects unique-local IPv6 prefixes", () => {
    expect(() => assertSafeImportUrl("http://fc00::1/post")).toThrow(UrlFetchSecurityError);
  });

  it("rejects loopback hostname literals", () => {
    expect(() => assertSafeImportUrl("http://::1/post")).toThrow(UrlFetchSecurityError);
  });

  it("skips undefined chunks while reading response bodies", async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: undefined })
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([1]) })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "text/plain" },
      body: { getReader: () => reader },
    });

    const result = await safeFetchBinary({
      url: "https://example.com/chunked",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.body).toEqual(Buffer.from([1]));
  });
});
