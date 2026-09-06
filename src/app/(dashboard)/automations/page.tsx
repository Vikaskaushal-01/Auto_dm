import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { prisma } from "@/lib/prisma";
import { computeMetrics } from "@/lib/analytics/metrics";
import { formatCount } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  PAUSED: "bg-amber-500/15 text-amber-400",
  DRAFT: "bg-neutral-700 text-neutral-300",
};

export default async function AutomationsListPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();

  const automations = await prisma.automation.findMany({
    where: { workspaceId },
    include: { triggers: true },
    orderBy: { createdAt: "desc" },
  });

  const metricsByAutomation = await Promise.all(
    automations.map(async (a) => {
      const metrics = await computeMetrics(
        ["autodm_dms_sent", "autodm_leads"],
        { workspaceId, automationId: a.id },
        "30d",
      );
      return [a.id, metrics] as const;
    }),
  );
  const metricsMap = Object.fromEntries(metricsByAutomation);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Automations</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Comment-to-DM automations that run on your Instagram account.
          </p>
        </div>
        <Link href="/automations/new">
          <span className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
            <Plus className="h-4 w-4" aria-hidden />
            Create Automation
          </span>
        </Link>
      </div>

      {automations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
          <Zap className="mx-auto h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-3 text-sm text-neutral-400">
            No automations yet. Create one to start turning comments into DMs.
          </p>
          <Link
            href="/automations/new"
            className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Create your first automation
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Automation</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Keywords</th>
                <th className="px-3 py-3 font-medium">DMs Sent (30d)</th>
                <th className="px-3 py-3 font-medium">Leads (30d)</th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => {
                const m = metricsMap[a.id];
                return (
                  <tr key={a.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40">
                    <td className="px-4 py-3">
                      <Link href={`/automations/${a.id}/edit`} className="font-medium text-neutral-200 hover:text-white">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[a.status],
                        )}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-neutral-400">
                      {a.triggers.flatMap((t) => t.keywordGroup).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-3 text-neutral-300">{formatCount(m.autodm_dms_sent.current)}</td>
                    <td className="px-3 py-3 text-neutral-300">{formatCount(m.autodm_leads.current)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
