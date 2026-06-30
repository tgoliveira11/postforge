import { describe, expect, it } from "vitest";
import {
  buildAnalyticsSessionHash,
  extractPostViewRequest,
  parseUserAgent,
} from "@/modules/analytics/analytics.request";

describe("parseUserAgent branches", () => {
  it("returns unknown defaults for missing user agent", () => {
    expect(parseUserAgent(null)).toEqual({
      userAgentFamily: null,
      browserName: null,
      browserVersion: null,
      osName: null,
      osVersion: null,
      deviceVendor: null,
      deviceModel: null,
      deviceType: "unknown",
    });
  });

  it("detects tablet devices", () => {
    const parsed = parseUserAgent(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    );
    expect(parsed.deviceType).toBe("tablet");
  });

  it("detects Edge, Firefox, Safari, and Chrome", () => {
    expect(parseUserAgent("Mozilla/5.0 Edg/120.0.0.0").browserName).toBe("Edge");
    expect(parseUserAgent("Mozilla/5.0 Firefox/121.0").browserName).toBe("Firefox");
    expect(parseUserAgent("Mozilla/5.0 Version/17.0 Safari/605.1.15").browserName).toBe("Safari");
    expect(parseUserAgent("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36").browserName).toBe("Chrome");
  });

  it("detects Windows, Android, macOS, and Linux", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0)").osName).toBe("Windows");
    expect(parseUserAgent("Mozilla/5.0 (Android 14)").osName).toBe("Android");
    expect(parseUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)").osName).toBe("macOS");
    expect(parseUserAgent("Mozilla/5.0 (X11; Linux x86_64)").osName).toBe("Linux");
  });
});

describe("extractPostViewRequest branches", () => {
  it("builds session hash from IP and user agent", () => {
    const request = new Request("https://example.com/blog/post", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "Mozilla/5.0",
      },
    });

    expect(buildAnalyticsSessionHash(request)).toHaveLength(48);
  });

  it("extracts utm medium and campaign params", () => {
    const request = new Request(
      "https://example.com/blog/post?utm_medium=email&utm_campaign=launch&utm_term=term&utm_content=cta"
    );

    const extracted = extractPostViewRequest(request);

    expect(extracted.utmMedium).toBe("email");
    expect(extracted.utmCampaign).toBe("launch");
    expect(extracted.requestMetadata.utmTerm).toBe("term");
    expect(extracted.requestMetadata.utmContent).toBe("cta");
  });

  it("handles anonymous clients without IP", () => {
    const extracted = extractPostViewRequest(new Request("https://example.com/blog/post"));

    expect(extracted.ipHash).toBeNull();
    expect(extracted.ipAddress).toBeNull();
  });

  it("detects mobile devices and iOS", () => {
    const mobile = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(mobile.deviceType).toBe("mobile");
    expect(mobile.osName).toBe("iOS");
    expect(mobile.osVersion).toBe("17.0");
  });

  it("reads x-real-ip when forwarded header is absent", () => {
    const request = new Request("https://example.com/blog/post", {
      headers: {
        "x-real-ip": "198.51.100.10",
        "user-agent": "Mozilla/5.0",
      },
    });

    const extracted = extractPostViewRequest(request);

    expect(extracted.ipHash).toBeTruthy();
  });

  it("stores raw IP when analytics env flag is enabled", () => {
    process.env.ANALYTICS_STORE_RAW_IP = "true";

    const request = new Request("https://example.com/blog/post", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "Mozilla/5.0",
      },
    });

    const extracted = extractPostViewRequest(request, { postSlug: "hello-world" });

    expect(extracted.ipAddress).toBe("203.0.113.10");
    expect(extracted.requestMetadata.postSlug).toBe("hello-world");
    expect(extracted.requestMetadata.requestProtocol).toBe("https");

    delete process.env.ANALYTICS_STORE_RAW_IP;
  });

  it("returns null utm params for invalid request URLs", () => {
    const request = {
      url: "not-a-valid-url",
      headers: new Headers(),
    } as Request;

    const extracted = extractPostViewRequest(request);

    expect(extracted.utmSource).toBeNull();
    expect(extracted.requestMetadata.path).toBeNull();
  });

  it("uses user agent family fallback when browser is unknown", () => {
    const parsed = parseUserAgent("CustomBot/1.0");
    expect(parsed.userAgentFamily).toBe("CustomBot/1.0");
    expect(parsed.browserName).toBeNull();
  });

  it("detects tablet user agents without mobile markers", () => {
    const parsed = parseUserAgent("Mozilla/5.0 (Tablet; CPU OS 10_0 like Mac OS X)");
    expect(parsed.deviceType).toBe("tablet");
  });

  it("prefers Edge over Chrome in combined user agents", () => {
    const parsed = parseUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    );
    expect(parsed.browserName).toBe("Edge");
    expect(parsed.browserVersion).toBe("120.0.0.0");
    expect(parsed.osName).toBe("Windows");
    expect(parsed.osVersion).toBe("10.0");
  });

  it("detects Safari only when Chrome token is absent", () => {
    const parsed = parseUserAgent("Mozilla/5.0 Version/17.0 Safari/605.1.15");
    expect(parsed.browserName).toBe("Safari");
    expect(parsed.browserVersion).toBe("17.0");
  });
});
