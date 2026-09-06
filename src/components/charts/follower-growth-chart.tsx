"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCompact, formatCount } from "@/lib/analytics/format";

export interface FollowerGrowthPoint {
  date: string; // ISO date, already formatted for display
  followers: number;
  gained: number;
  lost: number;
  net: number;
}

type Series = "followers" | "gained" | "lost" | "net";

const SERIES_OPTIONS: { key: Series; label: string; color: string }[] = [
  { key: "followers", label: "Followers", color: "#8b5cf6" },
  { key: "gained", label: "Gained", color: "#34d399" },
  { key: "lost", label: "Lost", color: "#f87171" },
  { key: "net", label: "Net Growth", color: "#38bdf8" },
];

function CustomTooltip({
  active,
  payload,
  label,
  seriesLabel,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  seriesLabel: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-neutral-400">{label}</p>
      <p className="mt-0.5 font-semibold text-white">
        {seriesLabel}: {formatCount(payload[0].value)}
      </p>
    </div>
  );
}

export function FollowerGrowthChart({ data }: { data: FollowerGrowthPoint[] }) {
  const [series, setSeries] = useState<Series>("followers");
  const active = SERIES_OPTIONS.find((s) => s.key === series)!;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Follower Growth</h3>
        <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 p-1">
          {SERIES_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSeries(opt.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                series === opt.key
                  ? "bg-violet-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="followerGrowthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={active.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#737373", fontSize: 11 }}
            axisLine={{ stroke: "#404040" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "#737373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => formatCompact(v)}
            domain={series === "followers" ? ["dataMin", "dataMax"] : undefined}
          />
          <Tooltip content={<CustomTooltip seriesLabel={active.label} />} />
          <Area
            type="monotone"
            dataKey={series}
            stroke={active.color}
            strokeWidth={2}
            fill="url(#followerGrowthFill)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
