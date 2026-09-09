import { db } from "@/lib/db";
import { getMetricValue, type MetricScope } from "./aggregate";
import { resolvePeriod, type PeriodInput } from "./periods";

export type TrendDirection = "up" | "down" | "flat";

export interface ComputedMetric {
  metricName: string;
  current: number;
  previous: number | null;
  absoluteChange: number | null;
  /** Relative % change. Null when there's no prior period OR prior was 0 (see isNew). */
  percentageChange: number | null;
  /** True when previous === 0 and current > 0 — UI should show "New", not "0%"/"∞%". */
  isNew: boolean;
  trend: TrendDirection;
  /** False when there's no prior-period data at all (not even a zero). */
  hasComparison: boolean;
}

const FLAT_EPSILON_PCT = 0.5;

/**
 * The single function every analytics card/page uses to turn a raw metric
 * into {current, previous, absoluteChange, percentageChange, trend}.
 */
export async function computeMetric(
  metricName: string,
  scope: MetricScope,
  period: PeriodInput = "30d",
): Promise<ComputedMetric> {
  const { current: currentRange, previous: previousRange } = resolvePeriod(period);
  const [currentRaw, previousRaw] = await Promise.all([
    getMetricValue(metricName, scope, currentRange),
    getMetricValue(metricName, scope, previousRange),
  ]);

  const current = currentRaw ?? 0;

  // 1. If we have a genuine historical comparison where previous is distinct
  if (previousRaw !== null && previousRaw > 0 && previousRaw !== current) {
    const previous = previousRaw;
    const absoluteChange = current - previous;
    const isNew = false;
    const percentageChange = (absoluteChange / previous) * 100;
    let trend: TrendDirection = "flat";
    if (Math.abs(percentageChange) >= FLAT_EPSILON_PCT) {
      trend = percentageChange > 0 ? "up" : "down";
    }
    return {
      metricName,
      current,
      previous,
      absoluteChange,
      percentageChange,
      isNew,
      trend,
      hasComparison: true,
    };
  }

  // 2. If this is a specific reel / post (scope.contentId)
  if (scope.contentId && current > 0) {
    // Check the daily timeline for this post to calculate real momentum and growth rate
    const postRows = await db.contentMetric.findMany({
      where: { postId: scope.contentId, metricDate: { lte: currentRange.end } },
      orderBy: { metricDate: "asc" },
    });

    if (postRows.length >= 2) {
      const isRate = metricName === "engagementRate" || metricName === "engagement_rate";
      // Split the timeline: baseline is initial launch period (first 35% of days, min 1)
      const split = Math.max(1, Math.floor(postRows.length * 0.35));
      const earlyRows = postRows.slice(0, split);

      if (isRate) {
        const earlyRate = earlyRows.reduce((a, r) => a + (r.engagementRate || 0), 0) / earlyRows.length;
        const currentRate = current;
        const delta = Math.round((currentRate - earlyRate) * 10) / 10;
        return {
          metricName,
          current,
          previous: Math.round(earlyRate * 10) / 10,
          absoluteChange: delta,
          percentageChange: delta,
          isNew: false,
          trend: delta >= 0.1 ? "up" : delta <= -0.1 ? "down" : "flat",
          hasComparison: true,
        };
      } else {
        const earlySum = earlyRows.reduce((a, r) => a + ((r as unknown as Record<string, number>)[metricName] || 0), 0);
        const baseline = Math.max(1, earlySum);
        const delta = current - baseline;
        const pct = (delta / baseline) * 100;
        return {
          metricName,
          current,
          previous: earlySum,
          absoluteChange: delta,
          percentageChange: pct,
          isNew: false,
          trend: pct >= FLAT_EPSILON_PCT ? "up" : pct <= -FLAT_EPSILON_PCT ? "down" : "flat",
          hasComparison: true,
        };
      }
    } else if (postRows.length === 1) {
      // Reel posted recently (single day snapshot so far)
      const isRate = metricName === "engagementRate" || metricName === "engagement_rate";
      return {
        metricName,
        current,
        previous: 0,
        absoluteChange: current,
        percentageChange: isRate ? current : 100,
        isNew: true,
        trend: "up",
        hasComparison: true,
      };
    }
  }

  // 3. Fallback standard comparisons for other scopes
  if (previousRaw === null) {
    return {
      metricName,
      current,
      previous: null,
      absoluteChange: null,
      percentageChange: null,
      isNew: false,
      trend: "flat",
      hasComparison: false,
    };
  }

  const previous = previousRaw;
  const absoluteChange = current - previous;
  const isNew = previous === 0 && current > 0;
  const percentageChange = previous === 0 ? (current > 0 ? 100 : null) : (absoluteChange / previous) * 100;

  let trend: TrendDirection = "flat";
  if (percentageChange !== null) {
    if (Math.abs(percentageChange) >= FLAT_EPSILON_PCT) {
      trend = percentageChange > 0 ? "up" : "down";
    }
  } else if (isNew) {
    trend = "up";
  }

  return {
    metricName,
    current,
    previous,
    absoluteChange,
    percentageChange,
    isNew,
    trend,
    hasComparison: true,
  };
}

export async function computeMetrics(
  metricNames: string[],
  scope: MetricScope,
  period: PeriodInput = "30d",
): Promise<Record<string, ComputedMetric>> {
  const entries = await Promise.all(
    metricNames.map(async (name) => [name, await computeMetric(name, scope, period)] as const),
  );
  return Object.fromEntries(entries);
}
