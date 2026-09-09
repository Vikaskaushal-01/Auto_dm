import { cache } from "react";
import { db } from "@/lib/db";
import type { DateRange } from "./periods";

/**
 * Every metric that shares a table (e.g. the 11 ContentMetric-derived fields
 * on a reel, or the 5 follower-family fields) used to issue one findMany per
 * metric name — computeMetrics([...11 keys]) on the reel detail page fired
 * ~22 near-identical queries (11 metrics x current+previous) against the
 * exact same row set, just to pluck a different field out afterward. These
 * cache()-wrapped fetchers dedupe by primitive args (React's per-request
 * cache only dedupes on reference/value equality, so Date objects — a fresh
 * instance per resolvePeriod() call — would never match; timestamps as
 * numbers do), collapsing every same-scope-and-range call site down to one
 * DB round trip per render.
 */
const fetchContentMetricRows = cache(async (postId: string, startMs: number, endMs: number) => {
  const rows = await db.contentMetric.findMany({
    where: { postId, metricDate: { gte: new Date(startMs), lte: new Date(endMs) } },
    orderBy: { metricDate: "asc" },
  });
  if (rows.length > 0) return rows;

  // Only fallback to latest row if querying the current/recent range.
  // Never fallback for historical ranges, otherwise previous matches current and deltas become 0.
  const isCurrentRange = endMs >= Date.now() - 24 * 60 * 60 * 1000;
  if (isCurrentRange) {
    return db.contentMetric.findMany({
      where: { postId },
      orderBy: { metricDate: "desc" },
      take: 1,
    });
  }

  return [];
});

const fetchFollowerSnapshotRows = cache(async (accountId: string, startMs: number, endMs: number) => {
  return db.followerSnapshot.findMany({
    where: { socialAccountId: accountId, snapshotDate: { gte: new Date(startMs), lte: new Date(endMs) } },
    orderBy: { snapshotDate: "asc" },
  });
});

export interface MetricScope {
  workspaceId: string;
  accountId?: string;
  contentId?: string;
  campaignId?: string;
  automationId?: string;
}

type Aggregation = "sum" | "avg" | "last";

const CONTENT_METRIC_FIELDS = new Set([
  "views",
  "reach",
  "impressions",
  "likes",
  "comments",
  "shares",
  "saves",
  "watchTimeSeconds",
  "engagementRate",
  "profileVisits",
  "followersGained",
  "linkClicks",
]);

const FOLLOWER_METRIC_FIELDS = new Set([
  "followers",
  "following",
  "followers_gained",
  "followers_lost",
  "followers_net",
]);

const RATE_METRICS = new Set(["engagementRate", "engagement_rate"]);
const LAST_VALUE_METRICS = new Set(["followers", "following"]);

function aggregationFor(metricName: string): Aggregation {
  if (LAST_VALUE_METRICS.has(metricName)) return "last";
  if (RATE_METRICS.has(metricName)) return "avg";
  return "sum";
}

function reduceValues(values: number[], aggregation: Aggregation): number {
  if (values.length === 0) return 0;
  if (aggregation === "last") return values[values.length - 1];
  if (aggregation === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Single entry point for reading a metric's value over a date range,
 * regardless of which table actually stores it. Dispatch rule:
 *   - scope.contentId + a ContentMetric field name -> per-post daily rows
 *   - a follower-family name (+ scope.accountId)   -> FollowerSnapshot
 *   - anything else                                -> generic MetricSnapshot
 * Returns null when there is no data at all for the range (distinct from 0,
 * which means "we have data and it's zero") so computeMetric can tell
 * "no prior period" apart from "prior period was zero".
 */
export async function getMetricValue(
  metricName: string,
  scope: MetricScope,
  range: DateRange,
): Promise<number | null> {
  const aggregation = aggregationFor(metricName);

  if (scope.contentId && CONTENT_METRIC_FIELDS.has(metricName)) {
    const rows = await fetchContentMetricRows(scope.contentId, range.start.getTime(), range.end.getTime());
    if (rows.length === 0) return null;
    const values = rows.map((r) => (r as unknown as Record<string, number>)[metricName]);
    return reduceValues(values, aggregation);
  }

  if (FOLLOWER_METRIC_FIELDS.has(metricName)) {
    if (!scope.accountId) return null;
    const rows = await fetchFollowerSnapshotRows(scope.accountId, range.start.getTime(), range.end.getTime());
    if (rows.length === 0) return null;
    switch (metricName) {
      case "followers":
        return rows[rows.length - 1].followersCount;
      case "following":
        return rows[rows.length - 1].followingCount;
      case "followers_gained":
        return reduceValues(rows.map((r) => r.gained), "sum");
      case "followers_lost":
        return reduceValues(rows.map((r) => r.lost), "sum");
      case "followers_net":
        return reduceValues(rows.map((r) => r.net), "sum");
    }
  }

  const rows = await db.metricSnapshot.findMany({
    where: {
      workspaceId: scope.workspaceId,
      metricName,
      timestamp: { gte: range.start, lte: range.end },
      accountId: scope.accountId,
      contentId: scope.contentId,
      campaignId: scope.campaignId,
      automationId: scope.automationId,
    },
  });
  if (rows.length === 0) return null;
  return reduceValues(
    rows.map((r) => r.value),
    aggregation,
  );
}

export interface SeriesPoint {
  date: Date;
  value: number;
}

/** Same dispatch as getMetricValue, but returns the day-by-day points for charting. */
export async function getDailySeries(
  metricName: string,
  scope: MetricScope,
  range: DateRange,
): Promise<SeriesPoint[]> {
  if (FOLLOWER_METRIC_FIELDS.has(metricName)) {
    if (!scope.accountId) return [];
    const rows = await fetchFollowerSnapshotRows(scope.accountId, range.start.getTime(), range.end.getTime());
    return rows.map((r) => ({
      date: r.snapshotDate,
      value:
        metricName === "followers"
          ? r.followersCount
          : metricName === "following"
            ? r.followingCount
            : metricName === "followers_gained"
              ? r.gained
              : metricName === "followers_lost"
                ? r.lost
                : r.net,
    }));
  }

  if (scope.contentId && CONTENT_METRIC_FIELDS.has(metricName)) {
    const rows = await fetchContentMetricRows(scope.contentId, range.start.getTime(), range.end.getTime());
    return rows.map((r) => ({
      date: r.metricDate,
      value: (r as unknown as Record<string, number>)[metricName],
    }));
  }

  const rows = await db.metricSnapshot.findMany({
    where: {
      workspaceId: scope.workspaceId,
      metricName,
      timestamp: { gte: range.start, lte: range.end },
      accountId: scope.accountId,
      contentId: scope.contentId,
      campaignId: scope.campaignId,
      automationId: scope.automationId,
    },
    orderBy: { timestamp: "asc" },
  });
  return rows.map((r) => ({ date: r.timestamp, value: r.value }));
}
