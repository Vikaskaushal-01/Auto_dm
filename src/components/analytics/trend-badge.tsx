import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/lib/analytics/metrics";

const TREND_CONFIG = {
  up: { Icon: ArrowUp, className: "text-emerald-400", hex: "#34d399", word: "Increasing" },
  down: { Icon: ArrowDown, className: "text-red-400", hex: "#f87171", word: "Decreasing" },
  flat: { Icon: Minus, className: "text-neutral-400", hex: "#a3a3a3", word: "Steady" },
} as const;

export function trendColorHex(trend: TrendDirection): string {
  return TREND_CONFIG[trend].hex;
}

export function TrendBadge({
  trend,
  label,
  showWord = false,
}: {
  trend: TrendDirection;
  label: string;
  showWord?: boolean;
}) {
  const { Icon, className, word } = TREND_CONFIG[trend];
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
      {showWord && <span className="text-xs font-normal text-neutral-500">{word}</span>}
    </span>
  );
}
