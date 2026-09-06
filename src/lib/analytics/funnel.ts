import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { DateRange } from "./periods";

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
  where: Prisma.AutomationRunWhereInput,
  range?: DateRange,
): Promise<FunnelResult> {
  const scoped: Prisma.AutomationRunWhereInput = range
    ? { ...where, triggeredAt: { gte: range.start, lte: range.end } }
    : where;

  const [matched, sent, delivered, linkClicked, leads, converted, revenue] = await Promise.all([
    prisma.automationRun.count({ where: scoped }),
    prisma.automationRun.count({ where: { ...scoped, dmSentAt: { not: null } } }),
    prisma.automationRun.count({ where: { ...scoped, dmDeliveredAt: { not: null } } }),
    prisma.automationRun.count({ where: { ...scoped, linkClickedAt: { not: null } } }),
    prisma.automationRun.count({ where: { ...scoped, leadCapturedAt: { not: null } } }),
    prisma.automationRun.count({ where: { ...scoped, convertedAt: { not: null } } }),
    prisma.automationRun.aggregate({
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
    revenueCents: revenue._sum.revenueCents ?? 0,
  };
}
