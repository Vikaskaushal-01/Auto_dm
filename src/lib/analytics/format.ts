import type { ComputedMetric } from "./metrics";

export type MetricUnit = "COUNT" | "PERCENT" | "CURRENCY" | "SECONDS";

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatCount(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCurrencyINR(valueRupees: number): string {
  return `₹${formatCount(valueRupees)}`;
}

export function formatSeconds(value: number): string {
  const mins = Math.floor(value / 60);
  const secs = Math.round(value % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function formatMetricValue(
  value: number,
  unit: MetricUnit,
  opts: { compact?: boolean } = {},
): string {
  switch (unit) {
    case "PERCENT":
      return formatPercent(value);
    case "CURRENCY":
      return formatCurrencyINR(value);
    case "SECONDS":
      return formatSeconds(value);
    default:
      return opts.compact ? formatCompact(value) : formatCount(value);
  }
}

export interface MetricChangeDisplay {
  /** e.g. "+2,840", "-140K", "+1.1pp" */
  changeLabel: string;
  /** e.g. "+2.31%", "New", "—" */
  percentLabel: string;
}

/**
 * Spec convention: for PERCENT-unit metrics (engagement rate, open rate),
 * the headline "change" figure is the point difference ("+1.1"), not a
 * relative percentage-of-a-percentage — showing "+15%" for an 8.4% vs 7.3%
 * engagement rate would be technically correct but reads as a different,
 * larger-looking number than the metric itself. Every other unit shows a
 * relative percentage change as usual.
 */
export function formatMetricChange(
  metric: ComputedMetric,
  unit: MetricUnit,
  opts: { compact?: boolean } = {},
): MetricChangeDisplay {
  if (!metric.hasComparison || metric.absoluteChange === null) {
    return { changeLabel: "—", percentLabel: "No prior data" };
  }

  const sign = metric.absoluteChange > 0 ? "+" : metric.absoluteChange < 0 ? "-" : "";
  const absChange = Math.abs(metric.absoluteChange);

  if (unit === "PERCENT") {
    const changeLabel = `${sign}${absChange.toFixed(1)}pp`;
    const percentLabel = metric.isNew ? "New" : `${sign}${absChange.toFixed(1)}pp`;
    return { changeLabel, percentLabel };
  }

  const changeLabel = `${sign}${opts.compact ? formatCompact(absChange) : formatCount(absChange)}`;

  if (metric.isNew) {
    return { changeLabel, percentLabel: "New" };
  }
  if (metric.percentageChange === null) {
    return { changeLabel, percentLabel: "—" };
  }
  const pctSign = metric.percentageChange > 0 ? "+" : metric.percentageChange < 0 ? "-" : "";
  return {
    changeLabel,
    percentLabel: `${pctSign}${Math.abs(metric.percentageChange).toFixed(2)}%`,
  };
}
