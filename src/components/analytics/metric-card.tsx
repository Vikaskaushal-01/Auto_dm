import { cn } from "@/lib/utils";
import type { ComputedMetric } from "@/lib/analytics/metrics";
import { formatMetricChange, formatMetricValue, type MetricUnit } from "@/lib/analytics/format";
import { Sparkline } from "@/components/charts/sparkline";
import { TrendBadge, trendColorHex } from "./trend-badge";

export function MetricCard({
  title,
  metric,
  unit,
  compact,
  sparklineData,
  subtitle,
  className,
}: {
  title: string;
  metric: ComputedMetric;
  unit: MetricUnit;
  compact?: boolean;
  sparklineData?: number[];
  subtitle?: string;
  className?: string;
}) {
  const { changeLabel, percentLabel } = formatMetricChange(metric, unit, { compact });
  const valueLabel = formatMetricValue(metric.current, unit, { compact });

  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-800 bg-neutral-900/60 p-4",
        className,
      )}
    >
      <p className="text-sm text-neutral-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{valueLabel}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <TrendBadge trend={metric.trend} label={changeLabel} />
        <span className="text-neutral-500">{percentLabel}</span>
      </div>
      {subtitle && <p className="mt-1.5 text-xs text-neutral-500">{subtitle}</p>}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3 -mx-1">
          <Sparkline data={sparklineData} color={trendColorHex(metric.trend)} />
        </div>
      )}
    </div>
  );
}
