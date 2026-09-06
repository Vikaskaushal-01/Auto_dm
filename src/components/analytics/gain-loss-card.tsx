import { TrendingUp, TrendingDown, Equal } from "lucide-react";
import { formatCount } from "@/lib/analytics/format";
import type { ComputedMetric } from "@/lib/analytics/metrics";

export function GainLossCard({
  gained,
  lost,
  net,
}: {
  gained: ComputedMetric;
  lost: ComputedMetric;
  net: ComputedMetric;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Follower Growth</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Gained</span>
          </div>
          <p className="mt-1 text-xl font-semibold text-white">+{formatCount(gained.current)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-red-400">
            <TrendingDown className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Lost</span>
          </div>
          <p className="mt-1 text-xl font-semibold text-white">-{formatCount(lost.current)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-sky-400">
            <Equal className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">Net</span>
          </div>
          <p className="mt-1 text-xl font-semibold text-white">
            {net.current >= 0 ? "+" : ""}
            {formatCount(net.current)}
          </p>
        </div>
      </div>
      {gained.hasComparison && gained.percentageChange !== null && (
        <p className="mt-4 text-xs text-neutral-500">
          {gained.trend === "up" ? "Up" : gained.trend === "down" ? "Down" : "Flat"}{" "}
          {Math.abs(gained.percentageChange).toFixed(1)}% vs. the previous period.
        </p>
      )}
    </div>
  );
}
