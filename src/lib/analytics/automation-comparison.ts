import { prisma } from "@/lib/prisma";
import { getAutomationFunnel } from "./funnel";
import type { DateRange } from "./periods";

export interface AutomationComparisonRow {
  id: string;
  name: string;
  status: string;
  dmsSent: number;
  linkClicks: number;
  openRate: number; // linkClicks / dmsSent, as a percentage
  leads: number;
  conversions: number;
  conversionRate: number; // conversions / leads, as a percentage
  revenueCents: number;
}

export async function getAutomationComparisonRows(
  workspaceId: string,
  range: DateRange,
): Promise<AutomationComparisonRow[]> {
  const automations = await prisma.automation.findMany({
    where: { workspaceId },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    automations.map(async (a) => {
      const funnel = await getAutomationFunnel({ automationId: a.id }, range);
      const byKey = Object.fromEntries(funnel.stages.map((s) => [s.key, s.value]));
      const dmsSent = byKey.sent ?? 0;
      const linkClicks = byKey.linkClicked ?? 0;
      const leads = byKey.leads ?? 0;
      const conversions = byKey.converted ?? 0;

      return {
        id: a.id,
        name: a.name,
        status: a.status,
        dmsSent,
        linkClicks,
        openRate: dmsSent > 0 ? (linkClicks / dmsSent) * 100 : 0,
        leads,
        conversions,
        conversionRate: leads > 0 ? (conversions / leads) * 100 : 0,
        revenueCents: funnel.revenueCents,
      };
    }),
  );

  return rows;
}
