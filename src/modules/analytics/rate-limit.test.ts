import { describe, expect, it } from "vitest";
import { getAnalyticsClientKey, isRateLimited } from "@/modules/analytics/rate-limit";

describe("analytics rate limit", () => {
  it("creates stable client keys without storing raw IP in analytics tables", () => {
    const request = new Request("https://example.com/api/analytics/post-view", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "TestAgent/1.0",
      },
    });

    const key = getAnalyticsClientKey(request);
    expect(key).toBeTruthy();
    expect(key).not.toContain("203.0.113.10");
    expect(key).not.toContain("203");
  });

  it("rate limits repeated requests in memory", () => {
    const key = "test-client";
    let limited = false;

    for (let i = 0; i < 35; i += 1) {
      if (isRateLimited(key)) {
        limited = true;
        break;
      }
    }

    expect(limited).toBe(true);
  });

  it("builds anonymous client keys when IP headers are missing", () => {
    const request = new Request("https://example.com/api/analytics/post-view");
    const key = getAnalyticsClientKey(request);

    expect(key).toBeTruthy();
  });
});
