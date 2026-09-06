import Link from "next/link";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { computeMetrics } from "@/lib/analytics/metrics";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { getAutomationFunnel } from "@/lib/analytics/funnel";
import { getAutomationComparisonRows } from "@/lib/analytics/automation-comparison";
import type { AutomationComparisonRow } from "@/lib/analytics/automation-comparison";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { AutomationComparisonTable } from "@/components/analytics/automation-comparison-table";
import { formatCurrencyINR } from "@/lib/analytics/format";
import type { MetricUnit } from "@/lib/analytics/format";

const AUTODM_METRICS: { key: string; label: string; unit: MetricUnit }[] = [
  { key: "autodm_dms_sent", label: "Messages Sent", unit: "COUNT" },
  { key: "autodm_dms_delivered", label: "Delivered", unit: "COUNT" },
  { key: "autodm_link_clicks", label: "Links Opened", unit: "COUNT" },
  { key: "autodm_leads", label: "Leads", unit: "COUNT" },
  { key: "autodm_conversions", label: "Conversions", unit: "COUNT" },
];

export default async function AutoDMAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; sort?: string }>;
}) {
  const { period: periodParam, sort: sortParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;
  const VALID_SORTS = ["dmsSent", "linkClicks", "openRate", "leads", "conversionRate", "revenueCents"];
  const sortBy = (VALID_SORTS.includes(sortParam ?? "") ? sortParam : "dmsSent") as keyof AutomationComparisonRow;

  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();
  const scope = { workspaceId, accountId: socialAccount.id };
  const { current: currentRange } = resolvePeriod(period);
  const metricKeys = AUTODM_METRICS.map((m) => m.key);

  const [metrics, funnel, comparisonRows] = await Promise.all([
    computeMetrics(metricKeys, scope, period),
    getAutomationFunnel({ automation: { workspaceId } }, currentRange),
    getAutomationComparisonRows(workspaceId, currentRange),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">AutoDM Analytics</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Comment-to-DM funnel performance across every automation.
          </p>
        </div>
        <PeriodSelector active={period} basePath="/analytics/autodm" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {AUTODM_METRICS.map((m) => (
          <MetricCard key={m.key} title={m.label} metric={metrics[m.key]} unit={m.unit} />
        ))}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Funnel</h2>
          <span className="text-sm font-medium text-emerald-400">
            {formatCurrencyINR(funnel.revenueCents / 100)} revenue
          </span>
        </div>
        <FunnelChart stages={funnel.stages} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Automation Comparison</h2>
          <Link href="/analytics/compare" className="text-sm text-violet-400 hover:text-violet-300">
            View full comparison →
          </Link>
        </div>
        <AutomationComparisonTable
          rows={comparisonRows}
          sortBy={sortBy}
          period={period}
          basePath="/analytics/autodm"
          limit={5}
        />
      </div>
    </div>
  );
}
