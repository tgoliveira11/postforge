import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/modules/posts/posts.repository", () => ({
  findPostById: vi.fn(),
  findPublishedPostBySlug: vi.fn(),
}));

vi.mock("@/modules/analytics/analytics.repository", () => ({
  trackPostViewEvent: vi.fn(),
  sumAllViews: vi.fn(),
  sumViewsSince: vi.fn(),
  sumAllBlogViews: vi.fn(),
  sumBlogViewsSince: vi.fn(),
  countPostsWithViews: vi.fn(),
  getBlogViewsByDay: vi.fn(),
  getTopPostsByViews: vi.fn(),
  getPostViewsByDay: vi.fn(),
  getPostReferrerEvents: vi.fn(),
  getPostDeviceEvents: vi.fn(),
  getRecentPostViews: vi.fn(),
  getTopReferrerHosts: vi.fn(),
  getTopCountries: vi.fn(),
  getTopDeviceTypes: vi.fn(),
  getTopBrowsers: vi.fn(),
  getTopOperatingSystems: vi.fn(),
  getTopUtmSources: vi.fn(),
  getTopUtmCampaigns: vi.fn(),
  getRecentAnalyticsEvents: vi.fn(),
}));

import * as postsRepo from "@/modules/posts/posts.repository";
import * as repo from "@/modules/analytics/analytics.repository";
import {
  getBlogAnalyticsDetail,
  getBlogAnalyticsSummary,
  getPostAnalyticsDetail,
  getPostAnalyticsSummary,
  getTopPostsByViews,
  trackPostView,
} from "@/modules/analytics/analytics.service";

describe("analytics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trackPostView rejects unpublished posts", async () => {
    vi.mocked(postsRepo.findPostById).mockResolvedValue({
      id: "post-1",
      slug: "draft-post",
    } as never);
    vi.mocked(postsRepo.findPublishedPostBySlug).mockResolvedValue(undefined);

    await expect(
      trackPostView({ postId: "post-1", sessionHash: "hash" })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.trackPostViewEvent).not.toHaveBeenCalled();
  });

  it("trackPostView records published post views", async () => {
    vi.mocked(postsRepo.findPostById).mockResolvedValue({
      id: "post-1",
      slug: "published-post",
    } as never);
    vi.mocked(postsRepo.findPublishedPostBySlug).mockResolvedValue({
      id: "post-1",
      slug: "published-post",
    } as never);

    await trackPostView({ postId: "post-1", sessionHash: "hash" });
    expect(repo.trackPostViewEvent).toHaveBeenCalledWith({ postId: "post-1", sessionHash: "hash" });
  });

  it("getBlogAnalyticsSummary aggregates totals", async () => {
    vi.mocked(repo.sumAllBlogViews).mockResolvedValue(100);
    vi.mocked(repo.sumBlogViewsSince)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(80);
    vi.mocked(repo.countPostsWithViews).mockResolvedValue(3);

    const summary = await getBlogAnalyticsSummary();
    expect(summary.totalViews).toBe(100);
    expect(summary.viewsToday).toBe(5);
    expect(summary.postsWithViews).toBe(3);
  });

  it("getTopPostsByViews filters zero-view posts", async () => {
    vi.mocked(repo.getTopPostsByViews).mockResolvedValue([
      {
        postId: "a",
        title: "A",
        slug: "a",
        status: "published",
        totalViews: 10,
        viewsLast7Days: 4,
      },
      {
        postId: "b",
        title: "B",
        slug: "b",
        status: "draft",
        totalViews: 0,
        viewsLast7Days: 0,
      },
    ]);

    const rows = await getTopPostsByViews();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.postId).toBe("a");
  });

  it("getPostAnalyticsDetail loads breakdown data", async () => {
    vi.mocked(postsRepo.findPostById).mockResolvedValue({ id: "post-1" } as never);
    vi.mocked(repo.sumAllViews).mockResolvedValue(12);
    vi.mocked(repo.sumViewsSince).mockResolvedValue(3);
    vi.mocked(repo.getPostViewsByDay).mockResolvedValue([{ date: "2026-06-14", views: 3 }]);
    vi.mocked(repo.getPostReferrerEvents).mockResolvedValue([{ referrer: "https://google.com" }]);
    vi.mocked(repo.getPostDeviceEvents).mockResolvedValue([{ deviceType: "mobile" }]);
    vi.mocked(repo.getRecentPostViews).mockResolvedValue([
      { occurredAt: new Date("2026-06-14T12:00:00.000Z"), referrer: null, deviceType: "mobile" },
    ]);
    vi.mocked(repo.getTopReferrerHosts).mockResolvedValue([{ label: "google.com", count: 2 }]);
    vi.mocked(repo.getTopCountries).mockResolvedValue([{ label: "US", count: 2 }]);
    vi.mocked(repo.getTopDeviceTypes).mockResolvedValue([{ label: "mobile", count: 2 }]);
    vi.mocked(repo.getTopBrowsers).mockResolvedValue([{ label: "Chrome", count: 2 }]);
    vi.mocked(repo.getTopOperatingSystems).mockResolvedValue([{ label: "macOS", count: 2 }]);
    vi.mocked(repo.getTopUtmSources).mockResolvedValue([]);
    vi.mocked(repo.getTopUtmCampaigns).mockResolvedValue([]);
    vi.mocked(repo.getRecentAnalyticsEvents).mockResolvedValue([
      {
        occurredAt: new Date("2026-06-14T12:00:00.000Z"),
        postTitle: "Post",
        path: "/blog/post",
        referrerHost: "google.com",
        country: "US",
        city: "NYC",
        deviceType: "mobile",
        browserName: "Chrome",
        osName: "macOS",
        utmSource: null,
        utmCampaign: null,
        ipAddress: null,
        ipHash: "abc123",
        requestMetadata: { path: "/blog/post" },
      },
    ]);

    const detail = await getPostAnalyticsDetail("post-1");
    expect(detail.summary.totalViews).toBe(12);
    expect(detail.referrers[0]?.referrer).toBe("google.com");
    expect(detail.devices[0]?.deviceType).toBe("mobile");
    expect(detail.recentViews).toHaveLength(1);
    expect(detail.enriched.referrerHosts[0]?.label).toBe("google.com");
    expect(detail.enriched.recentVisits[0]?.ipAddress).toBeNull();
  });

  it("getBlogAnalyticsDetail skips enriched queries when there are no views", async () => {
    vi.mocked(repo.sumAllBlogViews).mockResolvedValue(0);
    vi.mocked(repo.sumBlogViewsSince).mockResolvedValue(0);
    vi.mocked(repo.countPostsWithViews).mockResolvedValue(0);
    vi.mocked(repo.getTopPostsByViews).mockResolvedValue([]);
    vi.mocked(repo.getBlogViewsByDay).mockResolvedValue([]);

    const detail = await getBlogAnalyticsDetail();

    expect(detail.summary.totalViews).toBe(0);
    expect(detail.enriched.recentVisits).toEqual([]);
    expect(repo.getTopReferrerHosts).not.toHaveBeenCalled();
    expect(repo.getRecentAnalyticsEvents).not.toHaveBeenCalled();
  });

  it("trackPostView rejects missing posts", async () => {
    vi.mocked(postsRepo.findPostById).mockResolvedValue(undefined);

    await expect(trackPostView({ postId: "missing", sessionHash: "hash" })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("getPostAnalyticsDetail throws when post is missing", async () => {
    vi.mocked(postsRepo.findPostById).mockResolvedValue(undefined);

    await expect(getPostAnalyticsDetail("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getPostAnalyticsDetail skips enriched queries when post has no views", async () => {
    vi.mocked(postsRepo.findPostById).mockResolvedValue({ id: "post-1" } as never);
    vi.mocked(repo.sumAllViews).mockResolvedValue(0);
    vi.mocked(repo.sumViewsSince).mockResolvedValue(0);
    vi.mocked(repo.getPostViewsByDay).mockResolvedValue([]);
    vi.mocked(repo.getPostReferrerEvents).mockResolvedValue([]);
    vi.mocked(repo.getPostDeviceEvents).mockResolvedValue([]);
    vi.mocked(repo.getRecentPostViews).mockResolvedValue([]);

    const detail = await getPostAnalyticsDetail("post-1");

    expect(detail.summary.totalViews).toBe(0);
    expect(detail.enriched.recentVisits).toEqual([]);
    expect(repo.getTopReferrerHosts).not.toHaveBeenCalled();
  });

  it("getPostAnalyticsSummary returns totals", async () => {
    vi.mocked(repo.sumAllViews).mockResolvedValue(4);
    vi.mocked(repo.sumViewsSince).mockResolvedValue(1);

    const summary = await getPostAnalyticsSummary("post-1");

    expect(summary.totalViews).toBe(4);
  });

  it("getBlogAnalyticsDetail marks enriched unavailable when queries fail", async () => {
    vi.mocked(repo.sumAllBlogViews).mockResolvedValue(10);
    vi.mocked(repo.sumBlogViewsSince).mockResolvedValue(2);
    vi.mocked(repo.countPostsWithViews).mockResolvedValue(1);
    vi.mocked(repo.getTopPostsByViews).mockResolvedValue([]);
    vi.mocked(repo.getBlogViewsByDay).mockResolvedValue([]);
    vi.mocked(repo.getTopReferrerHosts).mockRejectedValue(new Error("column does not exist"));

    const detail = await getBlogAnalyticsDetail();

    expect(detail.enrichedUnavailable).toBe(true);
    expect(detail.enriched.recentVisits).toEqual([]);
  });
});
