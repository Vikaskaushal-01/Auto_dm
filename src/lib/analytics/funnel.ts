import { db } from "@/lib/db";
import type { DateRange } from "./periods";
import type { AutomationRunWhereInput } from "@/types/models";

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}

export interface FunnelResult {
  stages: FunnelStage[];
  revenueCents: number;
}

/**
 * Generic funnel counter over AutomationRun: Comments Matched -> DMs Sent ->
 * DMs Delivered -> Link Clicked -> Leads -> Converted. Reused for per-reel
 * (scoped to a post's comments), per-automation, and workspace-wide funnels
 * — callers just supply the right `where` clause.
 */
export async function getAutomationFunnel(
  where: AutomationRunWhereInput,
  range?: DateRange,
): Promise<FunnelResult> {
  const scoped: AutomationRunWhereInput = range
    ? { ...where, triggeredAt: { gte: range.start, lte: range.end } }
    : where;

  const [matched, sent, delivered, linkClicked, leads, converted, revenue] = await Promise.all([
    db.automationRun.count({ where: scoped }),
    db.automationRun.count({ where: { ...scoped, dmSentAt: { not: null } } }),
    db.automationRun.count({ where: { ...scoped, dmDeliveredAt: { not: null } } }),
    db.automationRun.count({ where: { ...scoped, linkClickedAt: { not: null } } }),
    db.automationRun.count({ where: { ...scoped, leadCapturedAt: { not: null } } }),
    db.automationRun.count({ where: { ...scoped, convertedAt: { not: null } } }),
    db.automationRun.aggregate({
      where: { ...scoped, convertedAt: { not: null } },
      _sum: { revenueCents: true },
    }),
  ]);

  return {
    stages: [
      { key: "matched", label: "Comments Matched", value: matched },
      { key: "sent", label: "DMs Sent", value: sent },
      { key: "delivered", label: "DMs Delivered", value: delivered },
      { key: "linkClicked", label: "Link Clicked", value: linkClicked },
      { key: "leads", label: "Leads", value: leads },
      { key: "converted", label: "Converted", value: converted },
    ],
    revenueCents: revenue._sum?.revenueCents ?? 0,
  };
}
