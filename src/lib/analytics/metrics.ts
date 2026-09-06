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
 * into {current, previous, absoluteChange, percentageChange, trend}. Never
 * query Prisma directly for a number that will be displayed — go through
 * this so the zero/missing-data rules stay consistent everywhere:
 *   - no prior period at all       -> hasComparison=false, percentageChange=null
 *   - prior period was exactly 0   -> isNew=true (if current>0), percentageChange=null
 *   - current === previous         -> trend="flat" (within a small epsilon)
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
  const percentageChange = previous === 0 ? null : (absoluteChange / previous) * 100;

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
