import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/analytics/insights";

const SEVERITY_CONFIG = {
  positive: { border: "border-emerald-500/60", bg: "bg-emerald-500/5", text: "text-emerald-100", Icon: TrendingUp },
  negative: { border: "border-red-500/60", bg: "bg-red-500/5", text: "text-red-100", Icon: TrendingDown },
  neutral: { border: "border-neutral-600", bg: "bg-neutral-800/40", text: "text-neutral-200", Icon: Minus },
} as const;

export function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" aria-hidden />
        <h3 className="text-sm font-semibold text-white">AI Insights</h3>
      </div>
      {insights.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Not enough history yet to generate insights for this period.
        </p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight, i) => {
            const { border, bg, text, Icon } = SEVERITY_CONFIG[insight.severity];
            return (
              <li
                key={i}
                className={cn("flex items-start gap-2 rounded-lg border-l-2 px-3 py-2 text-sm", border, bg, text)}
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{insight.headline}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
