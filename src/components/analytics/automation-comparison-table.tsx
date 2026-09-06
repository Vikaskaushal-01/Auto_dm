import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCount, formatCurrencyINR, formatPercent } from "@/lib/analytics/format";
import type { AutomationComparisonRow } from "@/lib/analytics/automation-comparison";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  PAUSED: "bg-amber-500/15 text-amber-400",
  DRAFT: "bg-neutral-700 text-neutral-300",
};

const SORT_OPTIONS: { key: keyof AutomationComparisonRow; label: string }[] = [
  { key: "dmsSent", label: "DMs" },
  { key: "linkClicks", label: "Opens" },
  { key: "openRate", label: "Open Rate" },
  { key: "leads", label: "Leads" },
  { key: "conversionRate", label: "Conversion" },
  { key: "revenueCents", label: "Revenue" },
];

export function AutomationComparisonTable({
  rows,
  sortBy,
  period,
  basePath,
  limit,
}: {
  rows: AutomationComparisonRow[];
  sortBy: keyof AutomationComparisonRow;
  period: string;
  basePath: string;
  limit?: number;
}) {
  const sorted = [...rows].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <Link
            key={opt.key}
            href={`${basePath}?period=${period}&sort=${opt.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              sortBy === opt.key
                ? "bg-violet-600 text-white"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Automation</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">DMs</th>
                <th className="px-3 py-3 font-medium">Opens</th>
                <th className="px-3 py-3 font-medium">Open Rate</th>
                <th className="px-3 py-3 font-medium">Leads</th>
                <th className="px-3 py-3 font-medium">Conversion</th>
                <th className="px-3 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/analytics/autodm/automations/${row.id}`}
                      className="font-medium text-neutral-200 hover:text-white"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLES[row.status],
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(row.dmsSent)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(row.linkClicks)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatPercent(row.openRate)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(row.leads)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatPercent(row.conversionRate)}</td>
                  <td className="px-3 py-3 text-emerald-400">
                    {formatCurrencyINR(row.revenueCents / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
