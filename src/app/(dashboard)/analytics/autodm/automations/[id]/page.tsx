import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/analytics/metrics";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { getAutomationFunnel } from "@/lib/analytics/funnel";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { formatCurrencyINR } from "@/lib/analytics/format";
import type { MetricUnit } from "@/lib/analytics/format";

const AUTOMATION_METRICS: { key: string; label: string; unit: MetricUnit }[] = [
  { key: "autodm_dms_sent", label: "Messages Sent", unit: "COUNT" },
  { key: "autodm_dms_delivered", label: "Delivered", unit: "COUNT" },
  { key: "autodm_link_clicks", label: "Links Opened", unit: "COUNT" },
  { key: "autodm_leads", label: "Leads", unit: "COUNT" },
  { key: "autodm_conversions", label: "Conversions", unit: "COUNT" },
];

const RUN_STATUS_STYLES: Record<string, string> = {
  TRIGGERED: "bg-neutral-700 text-neutral-300",
  DM_SENT: "bg-sky-500/15 text-sky-400",
  DM_DELIVERED: "bg-sky-500/15 text-sky-400",
  DM_FAILED: "bg-red-500/15 text-red-400",
  LINK_CLICKED: "bg-violet-500/15 text-violet-300",
  LEAD: "bg-amber-500/15 text-amber-400",
  CONVERTED: "bg-emerald-500/15 text-emerald-400",
};

export default async function AutomationPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period: periodParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;

  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  const automation = await db.automation.findFirst({
    where: { id, workspaceId },
    include: { triggers: true },
  });
  if (!automation) notFound();

  const scope = { workspaceId, accountId: socialAccount.id, automationId: automation.id };
  const { current: currentRange } = resolvePeriod(period);
  const metricKeys = AUTOMATION_METRICS.map((m) => m.key);

  const [metrics, funnel, recentRuns] = await Promise.all([
    computeMetrics(metricKeys, scope, period),
    getAutomationFunnel({ automationId: automation.id }, currentRange),
    db.automationRun.findMany({
      where: { automationId: automation.id },
      include: { comment: { select: { authorUsername: true } } },
      orderBy: { triggeredAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/analytics/autodm"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to AutoDM Analytics
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{automation.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Trigger: {automation.triggers.flatMap((t) => t.keywordGroup).join(", ") || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/automations/${automation.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </Link>
          <PeriodSelector active={period} basePath={`/analytics/autodm/automations/${automation.id}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {AUTOMATION_METRICS.map((m) => (
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

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Triggered</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-neutral-800/60">
                  <td className="px-3 py-2 text-neutral-300">
                    @{run.comment?.authorUsername ?? "unknown"}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">
                    {run.triggeredAt.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${RUN_STATUS_STYLES[run.status]}`}
                    >
                      {run.status.replace(/_/g, " ")}
                    </span>
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
