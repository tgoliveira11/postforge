import { beforeEach, describe, expect, it, vi } from "vitest";

type ChainTerminal = {
  limit?: ReturnType<typeof vi.fn>;
  offset?: ReturnType<typeof vi.fn>;
  orderBy?: ReturnType<typeof vi.fn>;
  where?: ReturnType<typeof vi.fn>;
  groupBy?: ReturnType<typeof vi.fn>;
};

function createChain(result: unknown, terminal: keyof ChainTerminal = "limit"): ChainTerminal {
  const terminalMock = vi.fn().mockResolvedValue(result);
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const self = () => chain;
  for (const method of ["from", "where", "orderBy", "groupBy", "innerJoin", "leftJoin", "limit", "offset"]) {
    chain[method] = vi.fn(self);
  }
  chain[terminal] = terminalMock;
  return chain as ChainTerminal;
}

const insertMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const valuesMock = vi.hoisted(() => vi.fn());
const onConflictDoUpdateMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/get-db", () => ({
  db: {
    insert: insertMock,
    select: selectMock,
  },
}));

import {
  countPostsWithViews,
  getBlogViewsByDay,
  getDailyStatsForPost,
  getPostDeviceEvents,
  getPostReferrerEvents,
  getPostViewsByDay,
  getRecentAnalyticsEvents,
  getRecentPostViews,
  getTopBrowsers,
  getTopCountries,
  getTopDeviceTypes,
  getTopOperatingSystems,
  getTopPostsByViews,
  getTopReferrerHosts,
  getTopUtmCampaigns,
  getTopUtmSources,
  hasSessionViewToday,
  insertAnalyticsEvent,
  sumAllBlogViews,
  sumAllViews,
  sumBlogViewsSince,
  sumViewsSince,
  trackPostViewEvent,
  upsertDailyView,
} from "@/modules/analytics/analytics.repository";

describe("analytics repository queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    valuesMock.mockReturnValue({
      onConflictDoUpdate: onConflictDoUpdateMock,
    });
    insertMock.mockReturnValue({ values: valuesMock });
    onConflictDoUpdateMock.mockResolvedValue(undefined);
  });

  it("insertAnalyticsEvent writes to the database", async () => {
    valuesMock.mockResolvedValueOnce(undefined);

    await insertAnalyticsEvent({
      postId: "post-1",
      eventType: "post_view",
      referrer: null,
      referrerHost: null,
      userAgentFamily: null,
      browserName: null,
      osName: null,
      deviceType: null,
      country: null,
      region: null,
      city: null,
      acceptLanguage: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      ipHash: null,
      ipAddress: null,
      sessionHash: null,
      requestMetadata: null,
    });

    expect(insertMock).toHaveBeenCalled();
  });

  it("hasSessionViewToday returns true when a row exists", async () => {
    const chain = createChain([{ id: "evt-1" }]);
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(hasSessionViewToday("post-1", "hash-1")).resolves.toBe(true);
  });

  it("hasSessionViewToday returns false when no row exists", async () => {
    const chain = createChain([]);
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(hasSessionViewToday("post-1", "hash-1")).resolves.toBe(false);
  });

  it("upsertDailyView increments unique views when requested", async () => {
    await upsertDailyView("post-1", { incrementUnique: true }, "2026-06-01");

    expect(onConflictDoUpdateMock).toHaveBeenCalled();
  });

  it("trackPostViewEvent without sessionHash does not check prior views", async () => {
    await trackPostViewEvent({ postId: "post-1" });

    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("getDailyStatsForPost returns ordered rows", async () => {
    const rows = [{ postId: "post-1", date: "2026-06-01", views: 3, uniqueViews: 2 }];
    const chain = createChain(rows, "orderBy");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getDailyStatsForPost("post-1")).resolves.toEqual(rows);
  });

  it("sumViewsSince coalesces missing totals to zero", async () => {
    const chain = createChain([{ total: 12 }], "where");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(sumViewsSince("post-1", "2026-06-01")).resolves.toBe(12);
  });

  it("sumAllViews returns numeric total", async () => {
    const chain = createChain([{ total: 99 }], "where");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(sumAllViews("post-1")).resolves.toBe(99);
  });

  it("sumBlogViewsSince returns numeric total", async () => {
    const chain = createChain([{ total: 50 }], "where");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(sumBlogViewsSince("2026-06-01")).resolves.toBe(50);
  });

  it("sumAllBlogViews returns numeric total", async () => {
    const chain = createChain([{ total: 200 }], "from");
    selectMock.mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ total: 200 }]) });

    await expect(sumAllBlogViews()).resolves.toBe(200);
  });

  it("countPostsWithViews returns numeric count", async () => {
    const chain = createChain([{ count: 4 }], "where");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(countPostsWithViews()).resolves.toBe(4);
  });

  it("getBlogViewsByDay maps date and views", async () => {
    const chain = createChain([{ date: "2026-06-01", views: 5 }], "orderBy");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getBlogViewsByDay("2026-06-01")).resolves.toEqual([
      { date: "2026-06-01", views: 5 },
    ]);
  });

  it("getPostViewsByDay maps date and views", async () => {
    const chain = createChain([{ date: "2026-06-01", views: 2 }], "orderBy");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getPostViewsByDay("post-1", "2026-06-01")).resolves.toEqual([
      { date: "2026-06-01", views: 2 },
    ]);
  });

  it("getTopPostsByViews maps aggregate fields", async () => {
    const chain = createChain(
      [
        {
          postId: "post-1",
          title: "Hello",
          slug: "hello",
          status: "published",
          totalViews: 10,
          viewsLast7Days: 3,
        },
      ],
      "limit"
    );
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopPostsByViews(5)).resolves.toEqual([
      {
        postId: "post-1",
        title: "Hello",
        slug: "hello",
        status: "published",
        totalViews: 10,
        viewsLast7Days: 3,
      },
    ]);
  });

  it("getPostReferrerEvents filters by optional since date", async () => {
    const chain = createChain([{ referrer: "https://google.com" }], "where");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getPostReferrerEvents("post-1", new Date("2026-06-01"))).resolves.toEqual([
      { referrer: "https://google.com" },
    ]);
  });

  it("getPostDeviceEvents returns device types", async () => {
    const chain = createChain([{ deviceType: "mobile" }], "where");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getPostDeviceEvents("post-1")).resolves.toEqual([{ deviceType: "mobile" }]);
  });

  it("getRecentPostViews returns recent rows", async () => {
    const occurredAt = new Date("2026-06-14T12:00:00.000Z");
    const chain = createChain([{ occurredAt, referrer: null, deviceType: "desktop" }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getRecentPostViews("post-1", 5)).resolves.toEqual([
      { occurredAt, referrer: null, deviceType: "desktop" },
    ]);
  });

  it("getTopReferrerHosts maps label counts", async () => {
    const chain = createChain([{ label: "google.com", count: 7 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopReferrerHosts({ postId: "post-1" })).resolves.toEqual([
      { label: "google.com", count: 7 },
    ]);
  });

  it("getTopCountries maps label counts", async () => {
    const chain = createChain([{ label: "US", count: 3 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopCountries({ since: new Date() })).resolves.toEqual([
      { label: "US", count: 3 },
    ]);
  });

  it("getTopDeviceTypes maps label counts", async () => {
    const chain = createChain([{ label: "mobile", count: 2 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopDeviceTypes({ postId: "post-1" })).resolves.toEqual([
      { label: "mobile", count: 2 },
    ]);
  });

  it("getTopBrowsers maps label counts", async () => {
    const chain = createChain([{ label: "Chrome", count: 4 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopBrowsers({ postId: "post-1" })).resolves.toEqual([
      { label: "Chrome", count: 4 },
    ]);
  });

  it("getTopOperatingSystems maps label counts", async () => {
    const chain = createChain([{ label: "macOS", count: 1 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopOperatingSystems({ postId: "post-1" })).resolves.toEqual([
      { label: "macOS", count: 1 },
    ]);
  });

  it("getTopUtmSources maps label counts", async () => {
    const chain = createChain([{ label: "newsletter", count: 6 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopUtmSources({ postId: "post-1" })).resolves.toEqual([
      { label: "newsletter", count: 6 },
    ]);
  });

  it("getTopUtmCampaigns maps label counts", async () => {
    const chain = createChain([{ label: "launch", count: 8 }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    await expect(getTopUtmCampaigns({ postId: "post-1" })).resolves.toEqual([
      { label: "launch", count: 8 },
    ]);
  });

  it("getRecentAnalyticsEvents uses default limit", async () => {
    const chain = createChain([{ occurredAt: new Date(), postTitle: "Hello" }], "limit");
    selectMock.mockReturnValueOnce({ from: vi.fn(() => chain) });

    const rows = await getRecentAnalyticsEvents({ postId: "post-1" });

    expect(rows).toHaveLength(1);
    expect(chain.limit).toHaveBeenCalledWith(20);
  });
});
