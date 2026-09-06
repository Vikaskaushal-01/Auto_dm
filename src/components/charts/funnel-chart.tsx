import { formatCount, formatPercent } from "@/lib/analytics/format";
import type { FunnelStage } from "@/lib/analytics/funnel";

const BAR_COLORS = [
  "bg-violet-500",
  "bg-violet-500/90",
  "bg-sky-500",
  "bg-sky-500/90",
  "bg-emerald-500",
  "bg-emerald-500/90",
];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.value || 1;

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPct = Math.max(2, (stage.value / max) * 100);
        const prevValue = i > 0 ? stages[i - 1].value : null;
        const conversionPct = prevValue && prevValue > 0 ? (stage.value / prevValue) * 100 : null;

        return (
          <div key={stage.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-neutral-300">{stage.label}</span>
              <span className="text-neutral-400">
                {formatCount(stage.value)}
                {conversionPct !== null && (
                  <span className="ml-2 text-xs text-neutral-500">
                    ({formatPercent(conversionPct)} of previous)
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
