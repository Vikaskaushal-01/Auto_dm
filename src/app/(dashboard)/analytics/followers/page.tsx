import { format } from "date-fns";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { computeMetrics } from "@/lib/analytics/metrics";
import { getDailySeries } from "@/lib/analytics/aggregate";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { GainLossCard } from "@/components/analytics/gain-loss-card";
import { FollowerGrowthChart } from "@/components/charts/follower-growth-chart";
import { formatCount } from "@/lib/analytics/format";

export default async function FollowersAnalyticsPage({
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

  const metricKeys = ["followers", "following", "followers_gained", "followers_lost", "followers_net"];
  const [metrics, followersSeries, gainedSeries, lostSeries, netSeries] = await Promise.all([
    computeMetrics(metricKeys, scope, period),
    getDailySeries("followers", scope, currentRange),
    getDailySeries("followers_gained", scope, currentRange),
    getDailySeries("followers_lost", scope, currentRange),
    getDailySeries("followers_net", scope, currentRange),
  ]);

  const chartData = followersSeries.map((point, i) => ({
    date: format(point.date, "MMM d"),
    followers: point.value,
    gained: gainedSeries[i]?.value ?? 0,
    lost: lostSeries[i]?.value ?? 0,
    net: netSeries[i]?.value ?? 0,
  }));

  const dailyBreakdown = [...chartData].reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Followers</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Growth, gains, and losses for @{socialAccount.username}.
          </p>
        </div>
        <PeriodSelector active={period} basePath="/analytics/followers" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard title="Followers" metric={metrics.followers} unit="COUNT" />
        <MetricCard title="Following" metric={metrics.following} unit="COUNT" />
      </div>

      <FollowerGrowthChart data={chartData} />

      <GainLossCard
        gained={metrics.followers_gained}
        lost={metrics.followers_lost}
        net={metrics.followers_net}
      />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Daily Breakdown</h3>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-neutral-900">
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Followers</th>
                <th className="py-2 pr-4 font-medium">Gained</th>
                <th className="py-2 pr-4 font-medium">Lost</th>
                <th className="py-2 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {dailyBreakdown.map((row, i) => (
                <tr key={i} className="border-b border-neutral-800/60 text-neutral-300">
                  <td className="py-2 pr-4">{row.date}</td>
                  <td className="py-2 pr-4">{formatCount(row.followers)}</td>
                  <td className="py-2 pr-4 text-emerald-400">+{formatCount(row.gained)}</td>
                  <td className="py-2 pr-4 text-red-400">-{formatCount(row.lost)}</td>
                  <td className={row.net >= 0 ? "py-2 text-emerald-400" : "py-2 text-red-400"}>
                    {row.net >= 0 ? "+" : ""}
                    {formatCount(row.net)}
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
