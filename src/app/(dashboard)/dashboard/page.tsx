import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { computeMetrics } from "@/lib/analytics/metrics";
import { getDailySeries } from "@/lib/analytics/aggregate";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { generateInsights } from "@/lib/analytics/insights";
import { getTopContent } from "@/lib/analytics/content";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { InsightsCard } from "@/components/analytics/insights-card";
import { TopContentCard } from "@/components/analytics/top-content-card";
import type { MetricUnit } from "@/lib/analytics/format";

const ACCOUNT_HEALTH_METRICS: { key: string; label: string; unit: MetricUnit; compact?: boolean }[] = [
  { key: "followers", label: "Followers", unit: "COUNT" },
  { key: "reach", label: "Reach", unit: "COUNT", compact: true },
  { key: "engagement_rate", label: "Engagement Rate", unit: "PERCENT" },
  { key: "profile_visits", label: "Profile Visits", unit: "COUNT" },
  { key: "website_clicks", label: "Website Clicks", unit: "COUNT" },
  { key: "impressions", label: "Impressions", unit: "COUNT", compact: true },
];

const AUTODM_METRICS: { key: string; label: string; unit: MetricUnit; compact?: boolean }[] = [
  { key: "autodm_dms_sent", label: "Messages Sent", unit: "COUNT" },
  { key: "autodm_link_clicks", label: "Links Opened", unit: "COUNT" },
  { key: "autodm_leads", label: "Leads", unit: "COUNT" },
  { key: "autodm_conversions", label: "Conversions", unit: "COUNT" },
  { key: "autodm_revenue", label: "Revenue", unit: "CURRENCY" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;

  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();
  const scope = { workspaceId, accountId: socialAccount.id };
  const { current: currentRange } = resolvePeriod(period);

  const allMetricKeys = [...ACCOUNT_HEALTH_METRICS, ...AUTODM_METRICS].map((m) => m.key);

  const [metrics, sparklines, insights, topContent] = await Promise.all([
    computeMetrics(allMetricKeys, scope, period),
    Promise.all(
      allMetricKeys.map(async (key) => {
        const series = await getDailySeries(key, scope, currentRange);
        return [key, series.map((p) => p.value)] as const;
      }),
    ).then((entries) => Object.fromEntries(entries) as Record<string, number[]>),
    generateInsights(scope),
    getTopContent(socialAccount.id, currentRange, 5, "views"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-400">
            @{socialAccount.username} — account health, AutoDM performance, and AI insights.
          </p>
        </div>
        <PeriodSelector active={period} basePath="/dashboard" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Account Health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {ACCOUNT_HEALTH_METRICS.map((m) => (
            <MetricCard
              key={m.key}
              title={m.label}
              metric={metrics[m.key]}
              unit={m.unit}
              compact={m.compact}
              sparklineData={sparklines[m.key]}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          AutoDM
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AUTODM_METRICS.map((m) => (
            <MetricCard
              key={m.key}
              title={m.label}
              metric={metrics[m.key]}
              unit={m.unit}
              compact={m.compact}
              sparklineData={sparklines[m.key]}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopContentCard posts={topContent} />
        <InsightsCard insights={insights} />
      </section>
    </div>
  );
}
