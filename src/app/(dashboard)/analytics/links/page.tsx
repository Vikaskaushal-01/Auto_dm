import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getLinkSummaries } from "@/lib/analytics/links";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { formatCount, formatCurrencyINR, formatPercent } from "@/lib/analytics/format";

export default async function LinksAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;

  const { workspaceId } = await getCurrentWorkspaceContext();
  const { current: currentRange } = resolvePeriod(period);
  const links = await getLinkSummaries(workspaceId, currentRange);

  const totals = links.reduce(
    (acc, l) => ({
      sent: acc.sent + l.sent,
      clicks: acc.clicks + l.clicks,
      leads: acc.leads + l.leads,
      conversions: acc.conversions + l.conversions,
      revenueCents: acc.revenueCents + l.revenueCents,
    }),
    { sent: 0, clicks: 0, leads: 0, conversions: 0, revenueCents: 0 },
  );
  const overallOpenRate = totals.sent > 0 ? (totals.clicks / totals.sent) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Links</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Every tracked link sent through AutoDM automations.
          </p>
        </div>
        <PeriodSelector active={period} basePath="/analytics/links" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Sent</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatCount(totals.sent)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Opened</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatCount(totals.clicks)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Open Rate</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatPercent(overallOpenRate)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Leads</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatCount(totals.leads)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Revenue</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {formatCurrencyINR(totals.revenueCents / 100)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-3 py-3 font-medium">Automation</th>
                <th className="px-3 py-3 font-medium">Sent</th>
                <th className="px-3 py-3 font-medium">Opened</th>
                <th className="px-3 py-3 font-medium">Unique</th>
                <th className="px-3 py-3 font-medium">Repeat</th>
                <th className="px-3 py-3 font-medium">Open Rate</th>
                <th className="px-3 py-3 font-medium">Leads</th>
                <th className="px-3 py-3 font-medium">Conversions</th>
                <th className="px-3 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-200">{link.label}</p>
                    <p className="text-xs text-neutral-500">
                      /{link.shortSlug}
                      {link.utmCampaign && ` · utm_campaign=${link.utmCampaign}`}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-neutral-400">{link.automationName ?? "—"}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(link.sent)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(link.clicks)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(link.uniqueClicks)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(link.repeatClicks)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatPercent(link.openRate)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(link.leads)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(link.conversions)}</td>
                  <td className="px-3 py-3 text-emerald-400">
                    {formatCurrencyINR(link.revenueCents / 100)}
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
