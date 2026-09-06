import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { getAutomationComparisonRows } from "@/lib/analytics/automation-comparison";
import type { AutomationComparisonRow } from "@/lib/analytics/automation-comparison";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { AutomationComparisonTable } from "@/components/analytics/automation-comparison-table";

const VALID_SORTS = ["dmsSent", "linkClicks", "openRate", "leads", "conversionRate", "revenueCents"];

export default async function CompareAutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; sort?: string }>;
}) {
  const { period: periodParam, sort: sortParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;
  const sortBy = (VALID_SORTS.includes(sortParam ?? "") ? sortParam : "dmsSent") as keyof AutomationComparisonRow;

  const { workspaceId } = await getCurrentWorkspaceContext();
  const { current: currentRange } = resolvePeriod(period);
  const rows = await getAutomationComparisonRows(workspaceId, currentRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Compare Automations</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Every automation, side by side. Click a column to sort.
          </p>
        </div>
        <PeriodSelector active={period} basePath="/analytics/compare" />
      </div>

      <AutomationComparisonTable rows={rows} sortBy={sortBy} period={period} basePath="/analytics/compare" />
    </div>
  );
}
