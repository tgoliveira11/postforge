import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Google Analytics public wiring", () => {
  it("loads GA only from the public route group layout", () => {
    const publicLayout = readSource("src/app/(public)/layout.tsx");
    const rootLayout = readSource("src/app/layout.tsx");

    expect(publicLayout).toContain("GoogleAnalytics");
    expect(publicLayout).toContain("config.googleAnalyticsMeasurementId");
    expect(publicLayout).toContain("config.analyticsEnabled");
    expect(rootLayout).not.toContain("GoogleAnalytics");
  });

  it("reads a measurement ID from settings or env without hard-coding one", () => {
    const source = readSource("src/modules/public/blog-config.ts");

    expect(source).toContain("googleAnalyticsMeasurementId");
    expect(source).toContain("GOOGLE_ANALYTICS_MEASUREMENT_ID");
    expect(source).toContain("NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID");
    expect(source).not.toMatch(/G-[A-Z0-9]{5,}/);
  });

  it("tracks SPA page views, public search events, and Web Vitals", () => {
    const source = readSource("src/components/public/google-analytics.tsx");

    expect(source).toContain("googletagmanager.com/gtag/js");
    expect(source).toContain("send_page_view: false");
    expect(source).toContain('"page_view"');
    expect(source).toContain("page_location");
    expect(source).toContain("page_path");
    expect(source).toContain("page_referrer");
    expect(source).toContain('"view_search_results"');
    expect(source).toContain("useReportWebVitals");
    expect(source).toContain("metric_rating");
    expect(source).toContain("metric_navigation_type");
  });
});
