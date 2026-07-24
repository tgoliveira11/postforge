"use client";

import { Suspense, useCallback, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useReportWebVitals } from "next/web-vitals";

type GtagArguments =
  | ["js", Date]
  | ["config", string, Record<string, unknown>?]
  | ["event", string, Record<string, unknown>?];

type WebVitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArguments) => void;
    __postforgeGoogleAnalyticsInitialized?: Record<string, boolean>;
    __postforgeGoogleAnalyticsPreviousLocation?: string;
  }
}

type GoogleAnalyticsProps = {
  measurementId?: string | null;
  enabled?: boolean;
};

export function getGoogleAnalyticsInitScript(measurementId: string): string {
  const encodedMeasurementId = JSON.stringify(measurementId);

  return `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
    window.__postforgeGoogleAnalyticsInitialized = window.__postforgeGoogleAnalyticsInitialized || {};
    if (!window.__postforgeGoogleAnalyticsInitialized[${encodedMeasurementId}]) {
      window.gtag("js", new Date());
      window.gtag("config", ${encodedMeasurementId}, {
        send_page_view: false,
        transport_type: "beacon"
      });
      window.__postforgeGoogleAnalyticsInitialized[${encodedMeasurementId}] = true;
    }
  `;
}

function ensureGoogleAnalytics(measurementId: string): void {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: GtagArguments) => {
      window.dataLayer?.push(args);
    });
  window.__postforgeGoogleAnalyticsInitialized =
    window.__postforgeGoogleAnalyticsInitialized || {};

  if (window.__postforgeGoogleAnalyticsInitialized[measurementId]) {
    return;
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    transport_type: "beacon",
  });
  window.__postforgeGoogleAnalyticsInitialized[measurementId] = true;
}

function GoogleAnalyticsRouteEvents({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    ensureGoogleAnalytics(measurementId);

    const queryString = searchParams.toString();
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname;
    const pageLocation = `${window.location.origin}${pagePath}`;
    const pageReferrer =
      window.__postforgeGoogleAnalyticsPreviousLocation || document.referrer || undefined;

    window.gtag?.("event", "page_view", {
      page_location: pageLocation,
      page_path: pagePath,
      page_referrer: pageReferrer,
      page_title: document.title,
      send_to: measurementId,
    });
    window.__postforgeGoogleAnalyticsPreviousLocation = pageLocation;

    const searchTerm = searchParams.get("q")?.trim();
    if (pathname === "/search" && searchTerm) {
      window.gtag?.("event", "view_search_results", {
        page_location: pageLocation,
        search_term: searchTerm,
        send_to: measurementId,
      });
    }
  }, [measurementId, pathname, searchParams]);

  return null;
}

function GoogleAnalyticsWebVitals({ measurementId }: { measurementId: string }) {
  const reportWebVitals = useCallback(
    (metric: WebVitalsMetric) => {
      ensureGoogleAnalytics(measurementId);

      window.gtag?.("event", metric.name, {
        event_category: "Web Vitals",
        event_label: metric.id,
        metric_delta: metric.delta,
        metric_id: metric.id,
        metric_name: metric.name,
        metric_navigation_type: metric.navigationType,
        metric_rating: metric.rating,
        metric_value: metric.value,
        non_interaction: true,
        send_to: measurementId,
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      });
    },
    [measurementId]
  );

  useReportWebVitals(reportWebVitals);
  return null;
}

export function GoogleAnalytics({ measurementId, enabled = true }: GoogleAnalyticsProps) {
  const normalizedMeasurementId = measurementId?.trim();
  if (!enabled || !normalizedMeasurementId) {
    return null;
  }

  return (
    <>
      <Script
        id="postforge-google-analytics-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
          normalizedMeasurementId
        )}`}
        strategy="afterInteractive"
      />
      <Script
        id="postforge-google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: getGoogleAnalyticsInitScript(normalizedMeasurementId),
        }}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsRouteEvents measurementId={normalizedMeasurementId} />
      </Suspense>
      <GoogleAnalyticsWebVitals measurementId={normalizedMeasurementId} />
    </>
  );
}
