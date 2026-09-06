import { subDays, startOfDay } from "date-fns";

export const NUM_DAYS = 90;

/** Day index 0 = 89 days ago, index NUM_DAYS-1 = today. */
export function dateForIndex(index: number): Date {
  return startOfDay(subDays(new Date(), NUM_DAYS - 1 - index));
}

export interface DailySeriesSegment {
  startIndex: number;
  endIndexExclusive: number;
  targetSum: number;
}

/**
 * Generates a `days`-length series of positive values with day-to-day noise,
 * then rescales each segment (in place, preserving relative shape) so its
 * sum matches `targetSum` exactly. Lets demo data hit specific headline KPIs
 * (e.g. "reach grew 14.2% over the last 30 days") while still looking like
 * organic daily variance rather than a straight line.
 */
export function buildScaledDailySeries(
  rng: () => number,
  days: number,
  baseline: number,
  noiseFrac: number,
  segments: DailySeriesSegment[],
): number[] {
  const raw = Array.from({ length: days }, () => baseline * (1 + (rng() - 0.5) * 2 * noiseFrac));
  for (const seg of segments) {
    const slice = raw.slice(seg.startIndex, seg.endIndexExclusive);
    const sum = slice.reduce((a, b) => a + b, 0);
    const factor = sum === 0 ? 1 : seg.targetSum / sum;
    for (let i = seg.startIndex; i < seg.endIndexExclusive; i++) raw[i] *= factor;
  }
  return raw.map((v) => Math.max(0, Math.round(v)));
}

/** Three consecutive 30-day segments over a 90-day window: oldest, mid, current. */
export function last90in30DaySegments(currentSum: number, growthRatioVsPrev: number) {
  const midSum = currentSum / growthRatioVsPrev;
  const oldestSum = midSum / growthRatioVsPrev;
  return {
    oldest: { startIndex: 0, endIndexExclusive: 30, targetSum: oldestSum },
    mid: { startIndex: 30, endIndexExclusive: 60, targetSum: midSum },
    current: { startIndex: 60, endIndexExclusive: 90, targetSum: currentSum },
  };
}
